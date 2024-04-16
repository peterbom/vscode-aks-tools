import {
    Acr,
    AcrKey,
    Cluster,
    ClusterKey,
    EntraIdApplication,
    EntraIdApplicationKey,
    GitHubRepo,
    GitHubRepoKey,
    GitHubRepoSecret,
    InitialSelection,
    ServicePrincipal,
    ServicePrincipalKey,
    Subscription,
    SubscriptionKey,
} from "../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { isLoaded, newNotLoaded } from "../../utilities/lazy";
import { WebviewStateUpdater } from "../../utilities/state";
import { AzureReferenceData, GitHubReferenceData, GitHubRepositoryReferenceData } from "./stateTypes";
import * as GitHubReferenceDataUpdate from "../state/update/gitHubReferenceDataUpdate";
import * as AzureReferenceDataUpdate from "../state/update/azureReferenceDataUpdate";
import { getWebviewMessageContext } from "../../utilities/vscode";

export type EventDef = {
    // Reference data loading
    setBranchesLoading: GitHubRepoKey;
    setSecretLoading: {
        key: GitHubRepoKey;
        secret: GitHubRepoSecret;
    };
    setOwnedApplicationsLoading: void;
    setServicePrincipalsLoading: EntraIdApplicationKey;
    setPullRequestFederatedCredentialLoading: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
    };
    setBranchFederatedCredentialLoading: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        branch: string;
    };
    setSubscriptionsLoading: void;
    setAcrsLoading: SubscriptionKey;
    setClustersLoading: SubscriptionKey;
    setAcrRoleAssignmentsLoading: {
        acrKey: AcrKey;
        servicePrincipalKey: ServicePrincipalKey;
    };
    setClusterRoleAssignmentsLoading: {
        clusterKey: ClusterKey;
        servicePrincipalKey: ServicePrincipalKey;
    };

    // GitHub selections
    setSelectedRepository: GitHubRepo | null;
    setSelectedBranch: string | null;

    // Entra ID selections
    setSelectedApplication: EntraIdApplication | null;
    setSelectedServicePrincipal: ServicePrincipal | null;

    // Azure resource selections
    setSelectedSubscription: Subscription | null;
    setSelectedAcrResourceGroup: string | null;
    setSelectedClusterResourceGroup: string | null;
    setSelectedAcr: Acr | null;
    setSelectedCluster: Cluster | null;
};

export type AuthorizeGitHubWorkflowState = {
    // Reference data
    azureReferenceData: AzureReferenceData;
    gitHubReferenceData: GitHubReferenceData;

    // Properties waiting to be automatically selected when data is available
    pendingSelection: InitialSelection;

    // GitHub selections
    selectedRepository: GitHubRepo | null;
    selectedBranch: string | null;

    // Entra ID selections
    selectedApplication: EntraIdApplication | null;
    selectedServicePrincipal: ServicePrincipal | null;

    // Azure resource selections
    selectedSubscription: Subscription | null;
    selectedAcrResourceGroup: string | null;
    selectedClusterResourceGroup: string | null;
    selectedAcr: Acr | null;
    selectedCluster: Cluster | null;
};

export const stateUpdater: WebviewStateUpdater<"authorizeGitHubWorkflow", EventDef, AuthorizeGitHubWorkflowState> = {
    createState: (initialState) => ({
        // Reference data
        azureReferenceData: {
            tenantId: initialState.tenantId,
            ownedApplications: newNotLoaded(),
            subscriptions: newNotLoaded(),
        },
        gitHubReferenceData: {
            repositories: initialState.repos.map<GitHubRepositoryReferenceData>((repo) => ({
                repository: repo,
                secretState: { CLIENT_ID: newNotLoaded(), TENANT_ID: newNotLoaded(), SUBSCRIPTION_ID: newNotLoaded() },
                branches: newNotLoaded(),
            })),
        },

        // Pending selections (remove those we can select immediately)
        pendingSelection: {
            ...initialState.initialSelection,
            repositoryOwner: undefined,
            repositoryName: undefined,
        },

        // Selected items
        selectedRepository:
            initialState.repos.find(
                (r) =>
                    r.gitHubRepoOwner === initialState.initialSelection.repositoryOwner &&
                    r.gitHubRepoName === initialState.initialSelection.repositoryName,
            ) || null,
        selectedBranch: null,
        selectedApplication: null,
        selectedServicePrincipal: null,
        selectedSubscription: null,
        selectedAcrResourceGroup: null,
        selectedClusterResourceGroup: null,
        selectedAcr: null,
        selectedCluster: null,

        // Error reporting
        operationErrors: [],
    }),
    vscodeMessageHandler: {
        // Reference data responses
        getBranchesResponse: (state, args) => ({
            ...state,
            selectedBranch: getSelectedBranch(state.selectedRepository, args.key, args.branches),
            gitHubReferenceData: GitHubReferenceDataUpdate.updateBranches(
                state.gitHubReferenceData,
                args.key,
                args.branches,
            ),
        }),
        getOwnedApplicationsResponse: (state, args) => ({
            ...state,
            selectedApplication: getSelectedValue(
                args.applications,
                (a) => a.objectId === state.pendingSelection.entraIdApplicationId,
            ),
            selectedServicePrincipal: null,
            azureReferenceData: AzureReferenceDataUpdate.updateOwnedApplications(
                state.azureReferenceData,
                args.applications,
            ),
        }),
        getServicePrincipalsResponse: (state, args) => ({
            ...state,
            selectedServicePrincipal: getSelectedValue(
                args.servicePrincipals,
                (sp) => sp.servicePrincipalId === state.pendingSelection.servicePrincipalId,
            ),
            azureReferenceData: AzureReferenceDataUpdate.updateServicePrincipals(
                state.azureReferenceData,
                args.key.objectId,
                args.servicePrincipals,
            ),
        }),
        getSubscriptionsResponse: (state, args) => ({
            ...state,
            selectedSubscription: getSelectedValue(
                args.subscriptions,
                (s) => s.subscriptionId === state.pendingSelection.subscriptionId,
            ),
            selectedAcrResourceGroup: null,
            selectedClusterResourceGroup: null,
            selectedAcr: null,
            selectedCluster: null,
            azureReferenceData: AzureReferenceDataUpdate.updateSubscriptions(
                state.azureReferenceData,
                args.subscriptions,
            ),
        }),
        getAcrsResponse: (state, args) => ({
            ...state,
            selectedAcrResourceGroup: getSelectedValue(
                args.acrs.map((acr) => acr.resourceGroup),
                (rg) => rg === state.pendingSelection.acrResourceGroup,
            ),
            selectedAcr: getSelectedValue(
                args.acrs,
                (acr) =>
                    acr.resourceGroup === state.pendingSelection.acrResourceGroup &&
                    acr.acrName === state.pendingSelection.acrName,
            ),
            azureReferenceData: AzureReferenceDataUpdate.updateAcrs(
                state.azureReferenceData,
                args.key.subscriptionId,
                args.acrs,
            ),
        }),
        getClustersResponse: (state, args) => ({
            ...state,
            selectedClusterResourceGroup: getSelectedValue(
                args.clusters.map((c) => c.resourceGroup),
                (rg) => rg === state.pendingSelection.clusterResourceGroup,
            ),
            selectedCluster: getSelectedValue(
                args.clusters,
                (c) =>
                    c.resourceGroup === state.pendingSelection.clusterResourceGroup &&
                    c.clusterName === state.pendingSelection.clusterName,
            ),
            azureReferenceData: AzureReferenceDataUpdate.updateClusters(
                state.azureReferenceData,
                args.key.subscriptionId,
                args.clusters,
            ),
        }),

        // Federated identity credential responses
        getPullRequestFederatedCredentialResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updatePullRequestFederatedCredentialState(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
                args.hasCredential,
            ),
        }),
        getBranchFederatedCredentialResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateBranchFederatedCredentialState(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
                args.branch,
                args.hasCredential,
            ),
        }),
        createPullRequestFederatedCredentialResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updatePullRequestFederatedCredentialState(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
                args.hasCredential,
            ),
        }),
        createBranchFederatedCredentialResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateBranchFederatedCredentialState(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
                args.branch,
                args.hasCredential,
            ),
        }),

        // GitHub repo secrets responses
        getRepoSecretsResponse: (state, args) => ({
            ...state,
            gitHubReferenceData: GitHubReferenceDataUpdate.updateSecretState(
                state.gitHubReferenceData,
                args.key,
                args.secretState,
            ),
        }),
        updateRepoSecretResponse: (state, args) => ({
            ...state,
            gitHubReferenceData: GitHubReferenceDataUpdate.updateSecretState(
                state.gitHubReferenceData,
                args.key,
                args.secretState,
            ),
        }),

        // Azure resource role assignment responses
        getAcrRoleAssignmentsResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateAcrRoleAssignments(
                state.azureReferenceData,
                args.acrKey,
                args.servicePrincipalKey.servicePrincipalId,
                args.assignedRoleDefinitions,
            ),
        }),
        getClusterRoleAssignmentsResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateClusterRoleAssignments(
                state.azureReferenceData,
                args.clusterKey,
                args.servicePrincipalKey.servicePrincipalId,
                args.assignedRoleDefinitions,
            ),
        }),
        createAcrRoleAssignmentResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateAcrRoleAssignments(
                state.azureReferenceData,
                args.acrKey,
                args.servicePrincipalKey.servicePrincipalId,
                args.assignedRoleDefinitions,
            ),
        }),
        createClusterRoleAssignmentResponse: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.updateClusterRoleAssignments(
                state.azureReferenceData,
                args.clusterKey,
                args.servicePrincipalKey.servicePrincipalId,
                args.assignedRoleDefinitions,
            ),
        }),

        // Resource creation responses
        createEntraIdApplicationResponse: (state, args) => ({
            ...state,
            selectedApplication: args.newApplication,
            selectedServicePrincipal: args.newServicePrincipal,
            azureReferenceData: updateApplicationsAndServicePrincipals(
                state.azureReferenceData,
                args.applications,
                args.newApplication,
                args.newServicePrincipal,
            ),
        }),
    },
    eventHandler: {
        // Reference data loading
        setBranchesLoading: (state, key) => ({
            ...state,
            gitHubReferenceData: GitHubReferenceDataUpdate.setBranchesLoading(state.gitHubReferenceData, key),
        }),
        setSecretLoading: (state, args) => ({
            ...state,
            gitHubReferenceData: GitHubReferenceDataUpdate.setSecretLoading(
                state.gitHubReferenceData,
                args.key,
                args.secret,
            ),
        }),
        setOwnedApplicationsLoading: (state) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setOwnedApplicationsLoading(state.azureReferenceData),
        }),
        setServicePrincipalsLoading: (state, key) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setServicePrincipalsLoading(
                state.azureReferenceData,
                key.objectId,
            ),
        }),
        setPullRequestFederatedCredentialLoading: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setPullRequestFederatedCredentialLoading(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
            ),
        }),
        setBranchFederatedCredentialLoading: (state, args) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setBranchFederatedCredentialLoading(
                state.azureReferenceData,
                args.key.objectId,
                args.repositoryKey,
                args.branch,
            ),
        }),
        setSubscriptionsLoading: (state) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setSubscriptionsLoading(state.azureReferenceData),
        }),
        setAcrsLoading: (state, key) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setAcrsLoading(state.azureReferenceData, key.subscriptionId),
        }),
        setClustersLoading: (state, key) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setClustersLoading(
                state.azureReferenceData,
                key.subscriptionId,
            ),
        }),
        setAcrRoleAssignmentsLoading: (state, msg) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setAcrRoleAssignmentsLoading(
                state.azureReferenceData,
                msg.acrKey,
                msg.servicePrincipalKey.servicePrincipalId,
            ),
        }),
        setClusterRoleAssignmentsLoading: (state, msg) => ({
            ...state,
            azureReferenceData: AzureReferenceDataUpdate.setClusterRoleAssignmentsLoading(
                state.azureReferenceData,
                msg.clusterKey,
                msg.servicePrincipalKey.servicePrincipalId,
            ),
        }),

        // GitHub selections
        setSelectedRepository: (state, repo) => ({
            ...state,
            selectedRepository: repo,
            selectedBranch: repo !== null ? getSelectedBranch(repo, repo, getKnownBranches(state, repo)) : null,
        }),
        setSelectedBranch: (state, branch) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, branch: undefined },
            selectedBranch: branch,
        }),

        // Entra ID selections
        setSelectedApplication: (state, app) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, entraIdApplicationId: undefined },
            selectedApplication: app,
            selectedServicePrincipal: app !== null ? getSelectedServicePrincipal(state, app) : null,
        }),
        setSelectedServicePrincipal: (state, sp) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, servicePrincipalId: undefined },
            selectedServicePrincipal: sp,
        }),

        // Azure resource selections
        setSelectedSubscription: (state, sub) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, subscriptionId: undefined },
            selectedSubscription: sub,
            selectedAcrResourceGroup: null,
            selectedAcr: null,
            selectedClusterResourceGroup: null,
            selectedCluster: null,
        }),
        setSelectedAcrResourceGroup: (state, rg) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, acrResourceGroup: undefined },
            selectedAcrResourceGroup: rg,
            selectedAcr: null,
        }),
        setSelectedClusterResourceGroup: (state, rg) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, clusterResourceGroup: undefined },
            selectedClusterResourceGroup: rg,
            selectedCluster: null,
        }),
        setSelectedAcr: (state, acr) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, acrName: undefined },
            selectedAcr: acr,
        }),
        setSelectedCluster: (state, cluster) => ({
            ...state,
            pendingSelection: { ...state.pendingSelection, clusterName: undefined },
            selectedCluster: cluster,
        }),
    },
};

export const vscode = getWebviewMessageContext<"authorizeGitHubWorkflow">({
    getBranchesRequest: null,
    getOwnedApplicationsRequest: null,
    getServicePrincipalsRequest: null,
    getSubscriptionsRequest: null,
    getAcrsRequest: null,
    getClustersRequest: null,
    getPullRequestFederatedCredentialRequest: null,
    getBranchFederatedCredentialRequest: null,
    createPullRequestFederatedCredentialRequest: null,
    createBranchFederatedCredentialRequest: null,
    getRepoSecretsRequest: null,
    updateRepoSecretRequest: null,
    getAcrRoleAssignmentsRequest: null,
    getClusterRoleAssignmentsRequest: null,
    createAcrRoleAssignmentRequest: null,
    createClusterRoleAssignmentRequest: null,
    createEntraIdApplicationRequest: null,
});

function updateApplicationsAndServicePrincipals(
    state: AzureReferenceData,
    allApplications: EntraIdApplication[],
    newApplication: EntraIdApplication,
    newServicePrincipal: ServicePrincipal,
): AzureReferenceData {
    state = AzureReferenceDataUpdate.updateOwnedApplications(state, allApplications);

    const servicePrincipals = [newServicePrincipal];
    state = AzureReferenceDataUpdate.updateServicePrincipals(state, newApplication.objectId, servicePrincipals);

    return state;
}

function getKnownBranches(state: AuthorizeGitHubWorkflowState, key: GitHubRepoKey): string[] {
    const repo = state.gitHubReferenceData.repositories.find(
        (r) =>
            r.repository.gitHubRepoOwner === key.gitHubRepoOwner && r.repository.gitHubRepoName === key.gitHubRepoName,
    );

    if (!repo || !isLoaded(repo.branches)) {
        return [];
    }

    return repo.branches.value;
}

function getSelectedBranch(
    selectedRepo: GitHubRepo | null,
    repoForBranches: GitHubRepoKey,
    branches: string[],
): string | null {
    if (
        selectedRepo === null ||
        repoForBranches.gitHubRepoOwner !== selectedRepo.gitHubRepoOwner ||
        repoForBranches.gitHubRepoName !== selectedRepo.gitHubRepoName
    ) {
        return null;
    }

    const defaultBranch = selectedRepo.defaultBranch;
    if (!branches.includes(defaultBranch)) {
        return null;
    }

    return defaultBranch;
}

function getSelectedServicePrincipal(
    state: AuthorizeGitHubWorkflowState,
    application: EntraIdApplicationKey,
): ServicePrincipal | null {
    if (!isLoaded(state.azureReferenceData.ownedApplications)) {
        return null;
    }

    const appData = state.azureReferenceData.ownedApplications.value.find(
        (app) => app.application.objectId === application.objectId,
    );

    if (!appData || !isLoaded(appData.servicePrincipals)) {
        return null;
    }

    return appData.servicePrincipals.value.length === 1 ? appData.servicePrincipals.value[0] : null;
}

function getSelectedValue<TItem>(items: TItem[], matchesInitialValue: (item: TItem) => boolean): TItem | null {
    if (items.length === 1) {
        return items[0];
    }

    const initialItem = items.find(matchesInitialValue);
    if (initialItem) {
        return initialItem;
    }

    return null;
}
