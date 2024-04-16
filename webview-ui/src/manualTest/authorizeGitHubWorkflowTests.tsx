import { MessageHandler, MessageSink } from "../../../src/webview-contract/messaging";
import {
    Acr,
    AcrKey,
    AcrRoleDefinition,
    AcrRoleDefinitionKey,
    Cluster,
    ClusterKey,
    ClusterRoleDefinition,
    ClusterRoleDefinitionKey,
    EntraIdApplication,
    EntraIdApplicationKey,
    GitHubRepo,
    GitHubRepoKey,
    GitHubRepoSecret,
    GitHubRepoSecretState,
    InitialSelection,
    InitialState,
    ServicePrincipal,
    ServicePrincipalKey,
    Subscription,
    SubscriptionKey,
    ToVsCodeMsgDef,
    ToWebViewMsgDef,
    acrRoleLookup,
    clusterRoleLookup,
} from "../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { AuthorizeGitHubWorkflow } from "../AuthorizeGitHubWorkflow/AuthorizeGitHubWorkflow";
import { stateUpdater } from "../AuthorizeGitHubWorkflow/state/state";
import { Scenario } from "../utilities/manualTest";
import { delay } from "../utilities/time";

type ReferenceData = {
    applications: ApplicationData[];
    subscriptions: SubscriptionData[];
    gitHubRepos: GitHubRepoData[];
};

type SubscriptionData = {
    subscription: Subscription;
    resourceGroups: ResourceGroupData[];
};

type ResourceGroupData = {
    group: string;
    acrs: AcrData[];
    clusters: ClusterData[];
};

type AcrData = {
    name: string;
    roleAssignments: {
        [servicePrincipalId: string]: AcrRoleDefinition[];
    };
};

type ClusterData = {
    name: string;
    roleAssignments: {
        [servicePrincipalId: string]: ClusterRoleDefinition[];
    };
};

type RepoFederatedIdentityCredential = {
    owner: string;
    name: string;
};

type BranchFederatedIdentityCredential = {
    owner: string;
    name: string;
    branch: string;
};

type ApplicationData = {
    objectId: string;
    clientId: string;
    name: string;
    pullRequestFederatedCredentials: RepoFederatedIdentityCredential[];
    branchFederatedCredentials: BranchFederatedIdentityCredential[];
    servicePrincipals: ServicePrincipalData[];
};

type ServicePrincipalData = {
    servicePrincipalId: string;
    name: string;
};

type GitHubRepoData = {
    owner: string;
    name: string;
    forkName: string;
    branches: string[];
    secrets: GitHubRepoSecretState;
};

function getReferenceData(): ReferenceData {
    return {
        applications: Array.from({ length: 2 }, (_, i) => createApplicationData(`App ${i + 1}`, i + 1, 2)),
        subscriptions: Array.from({ length: 2 }, (_, i) => createSubscriptionData(i + 1)),
        gitHubRepos: Array.from({ length: 2 }, (_, i) => createGitHubRepoData(i + 1)),
    };
}

function createApplicationData(appName: string, appNumber: number, spCount: number): ApplicationData {
    return {
        name: appName,
        objectId: `0b7ec71d-${String(appNumber).padStart(4, "0")}-0000-0000-000000000000`,
        clientId: `c71e97id-${String(appNumber).padStart(4, "0")}-0000-0000-000000000000`,
        pullRequestFederatedCredentials: [],
        branchFederatedCredentials: [],
        servicePrincipals: Array.from({ length: spCount }, (_, i) =>
            createServicePrincipalData(appName, appNumber, i + 1),
        ),
    };
}

function createServicePrincipalData(appName: string, appNumber: number, spNumber: number): ServicePrincipalData {
    return {
        servicePrincipalId: `5efice00-${String(appNumber).padStart(4, "0")}-${String(spNumber).padStart(4, "0")}-0000-000000000000`,
        name: spNumber === 1 ? appName : `${appName} SP ${spNumber}`,
    };
}

function createSubscriptionData(subNumber: number): SubscriptionData {
    return {
        subscription: {
            subscriptionId: `5b516719-${String(subNumber).padStart(4, "0")}-0000-0000-000000000000`,
            name: `Test Sub ${subNumber}`,
        },
        resourceGroups: Array.from({ length: 2 }, (_, i) => createResourceGroupData(i + 1)),
    };
}

function createResourceGroupData(groupNumber: number): ResourceGroupData {
    return {
        group: `rg${groupNumber}`,
        clusters: Array.from({ length: 2 }, (_, i) => createClusterData(groupNumber, i + 1)),
        acrs: Array.from({ length: 2 }, (_, i) => createAcrData(groupNumber, i + 1)),
    };
}

function createClusterData(groupNumber: number, clusterNumber: number): ClusterData {
    return {
        name: `rg${groupNumber}_cluster${clusterNumber}`,
        roleAssignments: {},
    };
}

function createAcrData(groupNumber: number, acrNumber: number): AcrData {
    return {
        name: `rg${groupNumber}acr${acrNumber}`,
        roleAssignments: {},
    };
}

function createGitHubRepoData(repoNumber: number): GitHubRepoData {
    return {
        owner: `owner${repoNumber}`,
        name: `repo${repoNumber}`,
        forkName: repoNumber === 1 ? "upstream" : repoNumber === 2 ? "origin" : `fork${repoNumber}`,
        branches: Array.from({ length: 2 }, (_, i) => getBranchName(i + 1)),
        secrets: {
            CLIENT_ID: true,
            TENANT_ID: true,
            SUBSCRIPTION_ID: false,
        },
    };
}

function getBranchName(branchNumber: number): string {
    return branchNumber === 1 ? "main" : `feature/update${branchNumber}`;
}

function createUnpopulatedInitialSelection(): InitialSelection {
    return {};
}

function createPopulatedInitialSelection(referenceData: ReferenceData): InitialSelection {
    return {
        entraIdApplicationId: referenceData.applications[0].objectId,
        servicePrincipalId: referenceData.applications[0].servicePrincipals[0].servicePrincipalId,
        subscriptionId: referenceData.subscriptions[0].subscription.subscriptionId,
        acrResourceGroup: referenceData.subscriptions[0].resourceGroups[0].group,
        acrName: referenceData.subscriptions[0].resourceGroups[0].acrs[0].name,
        clusterResourceGroup: referenceData.subscriptions[0].resourceGroups[1].group,
        clusterName: referenceData.subscriptions[0].resourceGroups[1].clusters[0].name,
        repositoryOwner: referenceData.gitHubRepos[0].owner,
        repositoryName: referenceData.gitHubRepos[0].name,
        branch: referenceData.gitHubRepos[0].branches[0],
    };
}

function createInitialState(initialSelection: InitialSelection, referenceData: ReferenceData): InitialState {
    return {
        initialSelection,
        tenantId: "7e9a9700-0000-0000-0000-000000000000",
        repos: referenceData.gitHubRepos.map<GitHubRepo>((r) => ({
            forkName: r.forkName,
            url: `https://github.com/${r.owner}/${r.name}.git`,
            gitHubRepoOwner: r.owner,
            gitHubRepoName: r.name,
            isFork: false,
            defaultBranch: r.branches[0],
        })),
    };
}

export function getAuthorizeGitHubWorkflowScenarios() {
    function getMessageHandler(
        webview: MessageSink<ToWebViewMsgDef>,
        referenceData: ReferenceData,
    ): MessageHandler<ToVsCodeMsgDef> {
        return {
            getBranchesRequest: handleGetBranchesRequest,
            getOwnedApplicationsRequest: handleGetOwnedApplicationsRequest,
            getServicePrincipalsRequest: handleGetServicePrincipalsRequest,
            getSubscriptionsRequest: handleGetSubscriptionsRequest,
            getAcrsRequest: handleGetAcrsRequest,
            getClustersRequest: handleGetClustersRequest,
            getPullRequestFederatedCredentialRequest: (args) =>
                handleGetPullRequestFederatedCredentialRequest(args.key, args.repositoryKey),
            getBranchFederatedCredentialRequest: (args) =>
                handleGetBranchFederatedCredentialRequest(args.key, args.repositoryKey, args.branch),
            createPullRequestFederatedCredentialRequest: (args) =>
                handleCreatePullRequestFederatedCredentialRequest(args.key, args.repositoryKey),
            createBranchFederatedCredentialRequest: (args) =>
                handleCreateBranchFederatedCredentialRequest(args.key, args.repositoryKey, args.branch),
            getRepoSecretsRequest: handleGetRepoSecretsRequest,
            updateRepoSecretRequest: (args) => handleUpdateRepoSecretsRequest(args.key, args.secret),
            getAcrRoleAssignmentsRequest: (args) =>
                handleGetAcrRoleAssignmentsRequest(args.acrKey, args.servicePrincipalKey),
            getClusterRoleAssignmentsRequest: (args) =>
                handleGetClusterRoleAssignmentsRequest(args.clusterKey, args.servicePrincipalKey),
            createAcrRoleAssignmentRequest: (args) =>
                handleCreateAcrRoleAssignmentRequest(args.acrKey, args.servicePrincipalKey, args.roleDefinitionKey),
            createClusterRoleAssignmentRequest: (args) =>
                handleCreateClusterRoleAssignmentRequest(
                    args.clusterKey,
                    args.servicePrincipalKey,
                    args.roleDefinitionKey,
                ),
            createEntraIdApplicationRequest: (args) => handleCreateEntraIdApplicationRequest(args.applicationName),
        };

        async function handleGetBranchesRequest(repoKey: GitHubRepoKey) {
            await delay(2000);
            const forkData = referenceData.gitHubRepos.find(
                (r) => r.owner === repoKey.gitHubRepoOwner && r.name === repoKey.gitHubRepoName,
            );
            const branches = forkData?.branches || [];
            webview.postGetBranchesResponse({
                key: repoKey,
                branches,
            });
        }

        async function handleGetOwnedApplicationsRequest() {
            await delay(2000);
            const applications = referenceData.applications.map<EntraIdApplication>((a) => ({
                objectId: a.objectId,
                clientId: a.clientId,
                applicationName: a.name,
            }));
            webview.postGetOwnedApplicationsResponse({ applications });
        }

        async function handleGetServicePrincipalsRequest(key: EntraIdApplicationKey) {
            await delay(2000);
            const appData = referenceData.applications.find((a) => a.objectId === key.objectId);
            const servicePrincipals =
                appData?.servicePrincipals.map<ServicePrincipal>((sp) => ({
                    servicePrincipalId: sp.servicePrincipalId,
                    servicePrincipalName: sp.name,
                })) || [];
            webview.postGetServicePrincipalsResponse({ key, servicePrincipals });
        }

        async function handleGetSubscriptionsRequest() {
            await delay(2000);
            const subscriptions = referenceData.subscriptions.map((d) => d.subscription);
            webview.postGetSubscriptionsResponse({ subscriptions });
        }

        async function handleGetAcrsRequest(key: SubscriptionKey) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === key.subscriptionId,
            );
            const acrs: Acr[] =
                subData?.resourceGroups?.flatMap((g) =>
                    g.acrs.map((acr) => ({
                        ...key,
                        resourceGroup: g.group,
                        acrName: acr.name,
                    })),
                ) || [];

            webview.postGetAcrsResponse({ key, acrs });
        }

        async function handleGetClustersRequest(key: SubscriptionKey) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === key.subscriptionId,
            );
            const clusters: Cluster[] =
                subData?.resourceGroups?.flatMap((g) =>
                    g.clusters.map((cluster) => ({
                        ...key,
                        resourceGroup: g.group,
                        clusterName: cluster.name,
                    })),
                ) || [];

            webview.postGetClustersResponse({ key, clusters });
        }

        async function handleGetPullRequestFederatedCredentialRequest(
            key: EntraIdApplicationKey,
            repoKey: GitHubRepoKey,
        ) {
            await delay(2000);
            const appData = referenceData.applications.find((a) => a.objectId === key.objectId);
            const credentials = appData?.pullRequestFederatedCredentials || [];
            const hasCredential = credentials.some(
                (c) => c.owner === repoKey.gitHubRepoOwner && c.name === repoKey.gitHubRepoName,
            );
            webview.postGetPullRequestFederatedCredentialResponse({ key, repositoryKey: repoKey, hasCredential });
        }

        async function handleGetBranchFederatedCredentialRequest(
            key: EntraIdApplicationKey,
            repoKey: GitHubRepoKey,
            branch: string,
        ) {
            await delay(2000);
            const appData = referenceData.applications.find((a) => a.objectId === key.objectId);
            const credentials = appData?.branchFederatedCredentials || [];
            const hasCredential = credentials.some(
                (c) => c.owner === repoKey.gitHubRepoOwner && c.name === repoKey.gitHubRepoName && c.branch === branch,
            );
            webview.postGetBranchFederatedCredentialResponse({ key, repositoryKey: repoKey, branch, hasCredential });
        }

        async function handleCreatePullRequestFederatedCredentialRequest(
            key: EntraIdApplicationKey,
            repoKey: GitHubRepoKey,
        ) {
            await delay(2000);
            const appData = referenceData.applications.find((a) => a.objectId === key.objectId);
            appData?.pullRequestFederatedCredentials.push({
                owner: repoKey.gitHubRepoOwner,
                name: repoKey.gitHubRepoName,
            });
            webview.postCreatePullRequestFederatedCredentialResponse({
                key,
                repositoryKey: repoKey,
                hasCredential: true,
            });
        }

        async function handleCreateBranchFederatedCredentialRequest(
            key: EntraIdApplicationKey,
            repoKey: GitHubRepoKey,
            branch: string,
        ) {
            await delay(2000);
            const appData = referenceData.applications.find((a) => a.objectId === key.objectId);
            appData?.branchFederatedCredentials.push({
                owner: repoKey.gitHubRepoOwner,
                name: repoKey.gitHubRepoName,
                branch,
            });
            webview.postCreateBranchFederatedCredentialResponse({
                key,
                repositoryKey: repoKey,
                branch,
                hasCredential: true,
            });
        }

        async function handleGetRepoSecretsRequest(repoKey: GitHubRepoKey) {
            await delay(2000);
            const repoData = referenceData.gitHubRepos.find(
                (r) => r.owner === repoKey.gitHubRepoOwner && r.name === repoKey.gitHubRepoName,
            );
            const secretState: GitHubRepoSecretState = repoData?.secrets || {
                CLIENT_ID: false,
                TENANT_ID: false,
                SUBSCRIPTION_ID: false,
            };
            webview.postGetRepoSecretsResponse({ key: repoKey, secretState });
        }

        async function handleUpdateRepoSecretsRequest(repoKey: GitHubRepoKey, secret: GitHubRepoSecret) {
            await delay(2000);
            const repoData = referenceData.gitHubRepos.find(
                (r) => r.owner === repoKey.gitHubRepoOwner && r.name === repoKey.gitHubRepoName,
            );

            const secretState: GitHubRepoSecretState = {
                ...repoData!.secrets,
                [secret]: true,
            };
            repoData!.secrets = secretState;
            webview.postUpdateRepoSecretResponse({ key: repoKey, secret, secretState });
        }

        async function handleGetAcrRoleAssignmentsRequest(acrKey: AcrKey, servicePrincipalKey: ServicePrincipalKey) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === acrKey.subscriptionId,
            );
            const groupData = subData?.resourceGroups.find((g) => g.group === acrKey.resourceGroup);
            const acrData = groupData?.acrs.find((a) => a.name === acrKey.acrName);
            const assignedRoleDefinitions = acrData?.roleAssignments[servicePrincipalKey.servicePrincipalId] || [];
            webview.postGetAcrRoleAssignmentsResponse({ acrKey, servicePrincipalKey, assignedRoleDefinitions });
        }

        async function handleGetClusterRoleAssignmentsRequest(
            clusterKey: ClusterKey,
            servicePrincipalKey: ServicePrincipalKey,
        ) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === clusterKey.subscriptionId,
            );
            const groupData = subData?.resourceGroups.find((g) => g.group === clusterKey.resourceGroup);
            const clusterData = groupData?.clusters.find((c) => c.name === clusterKey.clusterName);
            const assignedRoleDefinitions = clusterData?.roleAssignments[servicePrincipalKey.servicePrincipalId] || [];
            webview.postGetClusterRoleAssignmentsResponse({ clusterKey, servicePrincipalKey, assignedRoleDefinitions });
        }

        async function handleCreateAcrRoleAssignmentRequest(
            acrKey: AcrKey,
            servicePrincipalKey: ServicePrincipalKey,
            roleDefinitionKey: AcrRoleDefinitionKey,
        ) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === acrKey.subscriptionId,
            );
            const groupData = subData?.resourceGroups.find((g) => g.group === acrKey.resourceGroup);
            const acrData = groupData?.acrs.find((a) => a.name === acrKey.acrName);
            if (acrData === undefined) {
                return;
            }

            if (acrData.roleAssignments[servicePrincipalKey.servicePrincipalId] === undefined) {
                acrData.roleAssignments[servicePrincipalKey.servicePrincipalId] = [];
            }

            const roleDefinitionId = `/subscriptions/${acrKey.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${roleDefinitionKey.roleDefinitionName}`;
            const roleDefinitions = acrData.roleAssignments[servicePrincipalKey.servicePrincipalId];
            if (!roleDefinitions.some((r) => r.roleDefinitionName === roleDefinitionKey.roleDefinitionName)) {
                const roleDefinition = { ...acrRoleLookup[roleDefinitionKey.roleDefinitionName], roleDefinitionId };
                roleDefinitions.push(roleDefinition);
            }

            webview.postCreateAcrRoleAssignmentResponse({
                acrKey,
                servicePrincipalKey,
                roleDefinitionKey,
                assignedRoleDefinitions: roleDefinitions,
            });
        }

        async function handleCreateClusterRoleAssignmentRequest(
            clusterKey: ClusterKey,
            servicePrincipalKey: ServicePrincipalKey,
            roleDefinitionKey: ClusterRoleDefinitionKey,
        ) {
            await delay(2000);
            const subData = referenceData.subscriptions.find(
                (d) => d.subscription.subscriptionId === clusterKey.subscriptionId,
            );
            const groupData = subData?.resourceGroups.find((g) => g.group === clusterKey.resourceGroup);
            const clusterData = groupData?.clusters.find((c) => c.name === clusterKey.clusterName);
            if (clusterData === undefined) {
                return;
            }

            if (clusterData.roleAssignments[servicePrincipalKey.servicePrincipalId] === undefined) {
                clusterData.roleAssignments[servicePrincipalKey.servicePrincipalId] = [];
            }

            const roleDefinitionId = `/subscriptions/${clusterKey.subscriptionId}/providers/Microsoft.Authorization/roleDefinitions/${roleDefinitionKey.roleDefinitionName}`;
            const roleDefinitions = clusterData.roleAssignments[servicePrincipalKey.servicePrincipalId];
            if (!roleDefinitions.some((r) => r.roleDefinitionName === roleDefinitionKey.roleDefinitionName)) {
                const roleDefinition = { ...clusterRoleLookup[roleDefinitionKey.roleDefinitionName], roleDefinitionId };
                roleDefinitions.push(roleDefinition);
            }

            webview.postCreateClusterRoleAssignmentResponse({
                clusterKey,
                servicePrincipalKey,
                roleDefinitionKey,
                assignedRoleDefinitions: roleDefinitions,
            });
        }

        async function handleCreateEntraIdApplicationRequest(applicationName: string) {
            await delay(2000);

            const newApplicationData = createApplicationData(applicationName, referenceData.applications.length + 1, 1);
            referenceData.applications.push(newApplicationData);

            const applications = referenceData.applications.map<EntraIdApplication>((a) => ({
                objectId: a.objectId,
                clientId: a.clientId,
                applicationName: a.name,
            }));

            webview.postCreateEntraIdApplicationResponse({
                newApplicationName: applicationName,
                applications,
                newApplication: {
                    objectId: newApplicationData.objectId,
                    clientId: newApplicationData.clientId,
                    applicationName: newApplicationData.name,
                },
                newServicePrincipal: {
                    servicePrincipalId: newApplicationData.servicePrincipals[0].servicePrincipalId,
                    servicePrincipalName: newApplicationData.servicePrincipals[0].name,
                },
            });
        }
    }

    function createScenario(name: string, getInitialSelection: (refData: ReferenceData) => InitialSelection) {
        const referenceData = getReferenceData();
        const initialSelection = getInitialSelection(referenceData);
        const initialState = createInitialState(initialSelection, referenceData);
        return Scenario.create(
            "authorizeGitHubWorkflow",
            name,
            () => <AuthorizeGitHubWorkflow {...initialState} />,
            (webview) => getMessageHandler(webview, referenceData),
            stateUpdater.vscodeMessageHandler,
        );
    }

    return [
        createScenario("blank", createUnpopulatedInitialSelection),
        createScenario("populated", createPopulatedInitialSelection),
    ];
}
