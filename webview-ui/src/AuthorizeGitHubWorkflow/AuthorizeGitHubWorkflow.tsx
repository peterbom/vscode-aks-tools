import { useEffect, useState } from "react";
import {
    Acr,
    AcrRoleDefinition,
    Cluster,
    ClusterRoleDefinition,
    EntraIdApplication,
    GitHubRepo,
    GitHubRepoSecret,
    InitialState,
    ServicePrincipal,
    Subscription,
    aksClusterUserRoleDefinitionName,
    contributorRoleDefinitionName,
} from "../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { Lazy, isLoaded, map as lazyMap } from "../utilities/lazy";
import { useStateManagement } from "../utilities/state";
import styles from "./AuthorizeGitHubWorkflow.module.css";
import {
    EventHandlerFunc,
    ensureAcrRoleAssignmentsLoaded,
    ensureAcrsLoaded,
    ensureBranchFederatedCredentialLoaded,
    ensureClusterRoleAssignmentsLoaded,
    ensureClustersLoaded,
    ensureGitHubRepoBranchNamesLoaded,
    ensureGitHubRepoSecretStateLoaded,
    ensureOwnedApplicationsLoaded,
    ensurePullRequestFederatedCredentialLoaded,
    ensureServicePrincipalsLoaded,
    ensureSubscriptionsLoaded,
} from "./state/dataLoading";
import { AuthorizeGitHubWorkflowState, stateUpdater, vscode } from "./state/state";
import { distinct } from "../utilities/array";
import { ResourceSelector } from "../components/ResourceSelector";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faClock, faPlus } from "@fortawesome/free-solid-svg-icons";
import { NewApplicationDialog } from "./dialogs/NewApplicationDialog";

export function AuthorizeGitHubWorkflow(initialState: InitialState) {
    const { state, eventHandlers } = useStateManagement(stateUpdater, initialState, vscode);

    const updates: EventHandlerFunc[] = [];
    const {
        lazyBranchNames,
        lazyHasClientIdSecret,
        lazyHasTenantIdSecret,
        lazyHasSubscriptionIdSecret,
        lazyOwnedApplications,
        lazyServicePrincipals,
        lazyHasPullRequestFederatedCredential,
        lazyHasBranchFederatedCredential,
        lazySubscriptions,
        lazyAcrResourceGroups,
        lazyClusterResourceGroups,
        lazyAcrs,
        lazyClusters,
        lazyAcrAssignedRoles,
        lazyClusterAssignedRoles,
    } = prepareData(state, updates);
    useEffect(() => {
        updates.map((fn) => fn(eventHandlers));
    });

    const [isNewApplicationDialogVisible, setIsNewApplicationDialogVisible] = useState(false);

    function getTenantIdSecretActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("TENANT_ID", "Set");

        if (state.selectedRepository === null) {
            return { ...commonProps, extraInfo: "Please select a GitHub repository." };
        }

        if (!isLoaded(lazyHasTenantIdSecret)) {
            return { ...commonProps, extraInfo: "Loading secret state..." };
        }

        const repo = state.selectedRepository;
        return {
            ...commonProps,
            isDone: lazyHasTenantIdSecret.value,
            canFix: true,
            fixAction: () => handleSetGitHubRepoSecret(repo, "TENANT_ID", state.azureReferenceData.tenantId),
            extraInfo: "",
        };
    }

    function getClientIdSecretActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("CLIENT_ID", "Set");

        if (state.selectedRepository === null) {
            return { ...commonProps, extraInfo: "Please select a GitHub repository." };
        }

        if (state.selectedApplication === null) {
            return { ...commonProps, extraInfo: "Please select an application." };
        }

        if (!isLoaded(lazyHasClientIdSecret)) {
            return { ...commonProps, extraInfo: "Loading secret state..." };
        }

        const repo = state.selectedRepository;
        const clientId = state.selectedApplication.clientId;
        return {
            ...commonProps,
            isDone: lazyHasClientIdSecret.value,
            canFix: true,
            fixAction: () => clientId !== null && handleSetGitHubRepoSecret(repo, "CLIENT_ID", clientId),
        };
    }

    function getSubscriptionIdSecretActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("SUBSCRIPTION_ID", "Set");

        if (state.selectedRepository === null) {
            return { ...commonProps, extraInfo: "Please select a GitHub repository." };
        }

        if (state.selectedSubscription === null) {
            return { ...commonProps, extraInfo: "Please select a subscription." };
        }

        if (!isLoaded(lazyHasSubscriptionIdSecret)) {
            return { ...commonProps, extraInfo: "Loading secret state..." };
        }

        const repo = state.selectedRepository;
        const subscriptionId = state.selectedSubscription.subscriptionId;
        return {
            ...commonProps,
            isDone: lazyHasSubscriptionIdSecret.value,
            canFix: true,
            fixAction: () => handleSetGitHubRepoSecret(repo, "SUBSCRIPTION_ID", subscriptionId),
        };
    }

    function getPullRequestCredentialActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("Pull Requests Credential", "Create");

        if (state.selectedRepository === null) {
            return { ...commonProps, extraInfo: "Please select a GitHub repository." };
        }

        if (state.selectedApplication === null) {
            return { ...commonProps, extraInfo: "Please select an application." };
        }

        if (!isLoaded(lazyHasPullRequestFederatedCredential)) {
            return { ...commonProps, extraInfo: "Loading federated credentials..." };
        }

        const repo = state.selectedRepository;
        const application = state.selectedApplication;
        const isDone = lazyHasPullRequestFederatedCredential.value;

        return {
            ...commonProps,
            isDone,
            canFix: !isDone,
            fixAction: () => handleCreatePullRequestFederatedCredential(application, repo),
        };
    }

    function getBranchCredentialActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("Branch Credential", "Create");

        if (state.selectedRepository === null) {
            return { ...commonProps, extraInfo: "Please select a GitHub repository." };
        }

        if (state.selectedBranch === null) {
            return { ...commonProps, extraInfo: "Please select a branch." };
        }

        if (state.selectedApplication === null) {
            return { ...commonProps, extraInfo: "Please select an application." };
        }

        if (!isLoaded(lazyHasBranchFederatedCredential)) {
            return { ...commonProps, extraInfo: "Loading federated credentials..." };
        }

        const repo = state.selectedRepository;
        const branch = state.selectedBranch;
        const application = state.selectedApplication;
        const isDone = lazyHasBranchFederatedCredential.value;

        return {
            ...commonProps,
            isDone,
            canFix: !isDone,
            fixAction: () => handleCreateBranchFederatedCredential(application, repo, branch),
        };
    }

    function getAcrAuthorizationActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("ACR Authorization", "Authorize");

        if (state.selectedAcr === null) {
            return { ...commonProps, extraInfo: "Please select an ACR." };
        }

        if (state.selectedServicePrincipal === null) {
            return { ...commonProps, extraInfo: "Please select a service principal." };
        }

        if (!isLoaded(lazyAcrAssignedRoles)) {
            return { ...commonProps, extraInfo: "Loading ACR role assignments..." };
        }

        const assignedRoles = lazyAcrAssignedRoles.value;
        const acr = state.selectedAcr;
        const servicePrincipal = state.selectedServicePrincipal;
        const isDone = assignedRoles.some((r) => r.roleDefinitionName === contributorRoleDefinitionName);

        return {
            ...commonProps,
            isDone,
            canFix: !isDone,
            fixAction: () => handleCreateAcrRoleAssignment(acr, servicePrincipal),
        };
    }

    function getClusterAuthorizationActionItemProps(): ActionItemProps {
        const commonProps = makeActionItemProps("Cluster Authorization", "Authorize");

        if (state.selectedCluster === null) {
            return { ...commonProps, extraInfo: "Please select a cluster." };
        }

        if (state.selectedServicePrincipal === null) {
            return { ...commonProps, extraInfo: "Please select a service principal." };
        }

        if (!isLoaded(lazyClusterAssignedRoles)) {
            return { ...commonProps, extraInfo: "Loading cluster role assignments..." };
        }

        const assignedRoles = lazyClusterAssignedRoles.value;
        const cluster = state.selectedCluster;
        const servicePrincipal = state.selectedServicePrincipal;
        const isDone = assignedRoles.some((r) => r.roleDefinitionName === aksClusterUserRoleDefinitionName);

        return {
            ...commonProps,
            isDone,
            canFix: !isDone,
            fixAction: () => handleCreateClusterRoleAssignment(cluster, servicePrincipal),
        };
    }

    function handleSetGitHubRepoSecret(repo: GitHubRepo, secret: GitHubRepoSecret, value: string) {
        eventHandlers.onSetSecretLoading({ key: repo, secret });
        vscode.postUpdateRepoSecretRequest({ key: repo, secret, value });
    }

    function handleCreatePullRequestFederatedCredential(application: EntraIdApplication, repo: GitHubRepo) {
        eventHandlers.onSetPullRequestFederatedCredentialLoading({ key: application, repositoryKey: repo });
        vscode.postCreatePullRequestFederatedCredentialRequest({ key: application, repositoryKey: repo });
    }

    function handleCreateBranchFederatedCredential(application: EntraIdApplication, repo: GitHubRepo, branch: string) {
        eventHandlers.onSetBranchFederatedCredentialLoading({ key: application, repositoryKey: repo, branch });
        vscode.postCreateBranchFederatedCredentialRequest({ key: application, repositoryKey: repo, branch });
    }

    function handleCreateAcrRoleAssignment(acr: Acr, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetAcrRoleAssignmentsLoading({ acrKey: acr, servicePrincipalKey: servicePrincipal });
        vscode.postCreateAcrRoleAssignmentRequest({
            acrKey: acr,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: contributorRoleDefinitionName },
        });
    }

    function handleCreateClusterRoleAssignment(cluster: Cluster, servicePrincipal: ServicePrincipal) {
        eventHandlers.onSetClusterRoleAssignmentsLoading({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
        });
        vscode.postCreateClusterRoleAssignmentRequest({
            clusterKey: cluster,
            servicePrincipalKey: servicePrincipal,
            roleDefinitionKey: { roleDefinitionName: aksClusterUserRoleDefinitionName },
        });
    }

    function handleCreateNewApplication(applicationName: string) {
        setIsNewApplicationDialogVisible(false);
        eventHandlers.onSetOwnedApplicationsLoading();
        vscode.postCreateEntraIdApplicationRequest({ applicationName });
    }

    return (
        <>
            <h2>Authorize GitHub Workflow</h2>
            <fieldset className={styles.inputContainer}>
                <h3 className={styles.fullWidth}>GitHub</h3>

                <label htmlFor="repo-input" className={styles.label}>
                    GitHub Repository
                </label>
                <ResourceSelector<GitHubRepo>
                    id="repo-input"
                    className={styles.control}
                    resources={state.gitHubReferenceData.repositories.map((r) => r.repository)}
                    selectedItem={state.selectedRepository}
                    valueGetter={(r) => r.url}
                    labelGetter={(r) => `${r.gitHubRepoOwner}/${r.gitHubRepoName} (${r.forkName})`}
                    onSelect={eventHandlers.onSetSelectedRepository}
                />

                <label htmlFor="branch-input" className={styles.label}>
                    Branch
                </label>
                <ResourceSelector<string>
                    id="branch-input"
                    className={styles.control}
                    resources={lazyBranchNames}
                    selectedItem={state.selectedBranch}
                    valueGetter={(b) => b}
                    labelGetter={(b) => b}
                    onSelect={eventHandlers.onSetSelectedBranch}
                />

                <label className={styles.label}>Repository Secrets</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <ActionItem {...getTenantIdSecretActionItemProps()} />
                    <ActionItem {...getClientIdSecretActionItemProps()} />
                    <ActionItem {...getSubscriptionIdSecretActionItemProps()} />
                </div>

                <h3 className={styles.fullWidth}>Entra ID</h3>

                <label htmlFor="application-input" className={styles.label}>
                    Entra ID Application
                </label>
                <ResourceSelector<EntraIdApplication>
                    id="application-input"
                    className={styles.control}
                    resources={lazyOwnedApplications}
                    selectedItem={state.selectedApplication}
                    valueGetter={(a) => a.objectId}
                    labelGetter={(a) => a.applicationName}
                    onSelect={eventHandlers.onSetSelectedApplication}
                />

                {isLoaded(lazyOwnedApplications) && (
                    <div className={styles.controlSupplement}>
                        <VSCodeButton appearance="icon" onClick={() => setIsNewApplicationDialogVisible(true)}>
                            <span className={styles.iconButton}>
                                <FontAwesomeIcon icon={faPlus} /> Create new
                            </span>
                        </VSCodeButton>
                    </div>
                )}

                <label htmlFor="service-principal-input" className={styles.label}>
                    Service Principal
                </label>
                <ResourceSelector<ServicePrincipal>
                    id="service-principal-input"
                    className={styles.control}
                    resources={lazyServicePrincipals}
                    selectedItem={state.selectedServicePrincipal}
                    valueGetter={(sp) => sp.servicePrincipalId}
                    labelGetter={(sp) => sp.servicePrincipalName}
                    onSelect={eventHandlers.onSetSelectedServicePrincipal}
                />

                <label className={styles.label}>Federated Identity Credentials</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <ActionItem {...getPullRequestCredentialActionItemProps()} />
                    <ActionItem {...getBranchCredentialActionItemProps()} />
                </div>

                <h3 className={styles.fullWidth}>Azure Resources</h3>

                <label htmlFor="subscription-input" className={styles.label}>
                    Subscription
                </label>
                <ResourceSelector<Subscription>
                    id="subscription-input"
                    className={styles.control}
                    resources={lazySubscriptions}
                    selectedItem={state.selectedSubscription}
                    valueGetter={(s) => s.subscriptionId}
                    labelGetter={(s) => s.name}
                    onSelect={eventHandlers.onSetSelectedSubscription}
                />

                <label htmlFor="acr-rg-input" className={styles.label}>
                    ACR Resource Group
                </label>
                <ResourceSelector<string>
                    id="acr-rg-input"
                    className={styles.control}
                    resources={lazyAcrResourceGroups}
                    selectedItem={state.selectedAcrResourceGroup}
                    valueGetter={(g) => g}
                    labelGetter={(g) => g}
                    onSelect={eventHandlers.onSetSelectedAcrResourceGroup}
                />

                <label htmlFor="acr-input" className={styles.label}>
                    Container Registry
                </label>
                <ResourceSelector<Acr>
                    id="acr-input"
                    className={styles.control}
                    resources={lazyAcrs}
                    selectedItem={state.selectedAcr}
                    valueGetter={(acr) => acr.acrName}
                    labelGetter={(acr) => acr.acrName}
                    onSelect={eventHandlers.onSetSelectedAcr}
                />

                <label htmlFor="cluster-rg-input" className={styles.label}>
                    Cluster Resource Group
                </label>
                <ResourceSelector<string>
                    id="cluster-rg-input"
                    className={styles.control}
                    resources={lazyClusterResourceGroups}
                    selectedItem={state.selectedClusterResourceGroup}
                    valueGetter={(g) => g}
                    labelGetter={(g) => g}
                    onSelect={eventHandlers.onSetSelectedClusterResourceGroup}
                />

                <label htmlFor="cluster-input" className={styles.label}>
                    Cluster
                </label>
                <ResourceSelector<Cluster>
                    id="cluster-input"
                    className={styles.control}
                    resources={lazyClusters}
                    selectedItem={state.selectedCluster}
                    valueGetter={(c) => c.clusterName}
                    labelGetter={(c) => c.clusterName}
                    onSelect={eventHandlers.onSetSelectedCluster}
                />

                <label className={styles.label}>Federated Identity Credentials</label>
                <div className={`${styles.control} ${styles.actionItemList}`}>
                    <ActionItem {...getAcrAuthorizationActionItemProps()} />
                    <ActionItem {...getClusterAuthorizationActionItemProps()} />
                </div>
            </fieldset>

            {isLoaded(lazyOwnedApplications) && (
                <NewApplicationDialog
                    shown={isNewApplicationDialogVisible}
                    existingApplicationNames={lazyOwnedApplications.value.map((a) => a.applicationName)}
                    onHidden={() => setIsNewApplicationDialogVisible(false)}
                    onCreate={(name) => handleCreateNewApplication(name)}
                />
            )}
        </>
    );
}

type LocalData = {
    lazyBranchNames: Lazy<string[]>;
    lazyHasClientIdSecret: Lazy<boolean>;
    lazyHasTenantIdSecret: Lazy<boolean>;
    lazyHasSubscriptionIdSecret: Lazy<boolean>;
    lazyOwnedApplications: Lazy<EntraIdApplication[]>;
    lazyServicePrincipals: Lazy<ServicePrincipal[]>;
    lazyHasPullRequestFederatedCredential: Lazy<boolean>;
    lazyHasBranchFederatedCredential: Lazy<boolean>;
    lazySubscriptions: Lazy<Subscription[]>;
    lazyAcrResourceGroups: Lazy<string[]>;
    lazyClusterResourceGroups: Lazy<string[]>;
    lazyAcrs: Lazy<Acr[]>;
    lazyClusters: Lazy<Cluster[]>;
    lazyAcrAssignedRoles: Lazy<AcrRoleDefinition[]>;
    lazyClusterAssignedRoles: Lazy<ClusterRoleDefinition[]>;
};

function prepareData(state: AuthorizeGitHubWorkflowState, updates: EventHandlerFunc[]): LocalData {
    const lazyBranchNames = ensureGitHubRepoBranchNamesLoaded(
        state.gitHubReferenceData,
        state.selectedRepository,
        updates,
    );
    const {
        TENANT_ID: lazyHasTenantIdSecret,
        CLIENT_ID: lazyHasClientIdSecret,
        SUBSCRIPTION_ID: lazyHasSubscriptionIdSecret,
    } = ensureGitHubRepoSecretStateLoaded(state.gitHubReferenceData, state.selectedRepository, updates);
    const lazyOwnedApplications = ensureOwnedApplicationsLoaded(state.azureReferenceData, updates);
    const lazyServicePrincipals = ensureServicePrincipalsLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        updates,
    );
    const lazyHasPullRequestFederatedCredential = ensurePullRequestFederatedCredentialLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        state.selectedRepository,
        updates,
    );
    const lazyHasBranchFederatedCredential = ensureBranchFederatedCredentialLoaded(
        state.azureReferenceData,
        state.selectedApplication,
        state.selectedRepository,
        state.selectedBranch,
        updates,
    );
    const lazySubscriptions = ensureSubscriptionsLoaded(state.azureReferenceData, updates);
    const lazySubscriptionAcrs = ensureAcrsLoaded(state.azureReferenceData, state.selectedSubscription, updates);
    const lazyAcrResourceGroups = lazyMap(lazySubscriptionAcrs, (acrs) => distinct(acrs.map((a) => a.resourceGroup)));
    const lazySubscriptionClusters = ensureClustersLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        updates,
    );
    const lazyClusterResourceGroups = lazyMap(lazySubscriptionClusters, (clusters) =>
        distinct(clusters.map((c) => c.resourceGroup)),
    );
    const lazyAcrs = lazyMap(lazySubscriptionAcrs, (acrs) =>
        acrs.filter((a) => a.resourceGroup === state.selectedAcrResourceGroup),
    );
    const lazyClusters = lazyMap(lazySubscriptionClusters, (clusters) =>
        clusters.filter((c) => c.resourceGroup === state.selectedClusterResourceGroup),
    );
    const lazyAcrAssignedRoles = ensureAcrRoleAssignmentsLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        state.selectedAcr,
        state.selectedApplication,
        state.selectedServicePrincipal,
        updates,
    );
    const lazyClusterAssignedRoles = ensureClusterRoleAssignmentsLoaded(
        state.azureReferenceData,
        state.selectedSubscription,
        state.selectedCluster,
        state.selectedApplication,
        state.selectedServicePrincipal,
        updates,
    );

    return {
        lazyBranchNames,
        lazyHasTenantIdSecret,
        lazyHasClientIdSecret,
        lazyHasSubscriptionIdSecret,
        lazyOwnedApplications,
        lazyServicePrincipals,
        lazyHasPullRequestFederatedCredential,
        lazyHasBranchFederatedCredential,
        lazySubscriptions,
        lazyAcrResourceGroups,
        lazyClusterResourceGroups,
        lazyAcrs,
        lazyClusters,
        lazyAcrAssignedRoles,
        lazyClusterAssignedRoles,
    };
}

function makeActionItemProps(description: string, fixButtonText: string): ActionItemProps {
    return {
        isDone: false,
        description,
        canFix: false,
        fixButtonText,
        fixAction: () => {},
        extraInfo: "",
    };
}

type ActionItemProps = {
    isDone: boolean;
    description: string;
    canFix: boolean;
    fixButtonText: string;
    fixAction: () => void;
    extraInfo: string;
};

function ActionItem(props: ActionItemProps) {
    return (
        <div className={styles.actionItem}>
            <div className={styles.actionDescription}>
                {props.isDone ? (
                    <FontAwesomeIcon icon={faCheckCircle} className={styles.successIndicator} />
                ) : (
                    <FontAwesomeIcon icon={faClock} />
                )}{" "}
                {props.description}{" "}
            </div>
            <VSCodeButton
                className={styles.actionButton}
                appearance="secondary"
                onClick={props.fixAction}
                disabled={!props.canFix}
                title={props.extraInfo}
            >
                {props.fixButtonText}
            </VSCodeButton>
            {props.extraInfo && (
                <span className={styles.actionExtraInfo}>
                    <i className={`${styles.inlineIcon} codicon codicon-info`} /> {props.extraInfo}
                </span>
            )}
        </div>
    );
}
