import { WebviewDefinition } from "../webviewTypes";

export type EntraIdApplicationKey = {
    objectId: string;
    clientId: string;
};

export type EntraIdApplication = EntraIdApplicationKey & {
    applicationName: string;
};

export type GitHubRepoKey = {
    gitHubRepoOwner: string;
    gitHubRepoName: string;
};

export type GitHubRepo = GitHubRepoKey & {
    forkName: string;
    url: string;
    isFork: boolean;
    defaultBranch: string;
};

export type GitHubRepoSecret = "CLIENT_ID" | "TENANT_ID" | "SUBSCRIPTION_ID";

export type GitHubRepoSecretState = Record<GitHubRepoSecret, boolean>;

export type ServicePrincipalKey = {
    servicePrincipalId: string; // Unique by itself, does not need to be combined with application ID.
};

export type ServicePrincipal = ServicePrincipalKey & {
    servicePrincipalName: string;
};

export type SubscriptionKey = {
    subscriptionId: string;
};

export type Subscription = SubscriptionKey & {
    name: string;
};

export type AcrKey = SubscriptionKey & {
    resourceGroup: string;
    acrName: string;
};

export type Acr = AcrKey; // Fully-defined by its key

export type ClusterKey = SubscriptionKey & {
    resourceGroup: string;
    clusterName: string;
};

export type Cluster = ClusterKey; // Fully-defined by its key

// https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
export const acrPushRoleDefinitionName = "8311e382-0749-4cb8-b61a-304f252e45ec";
export const acrPushRoleName = "AcrPush";

export const contributorRoleDefinitionName = "b24988ac-6180-42a0-ab88-20f7382dd24c";
export const contributorRoleName = "Contributor";

export const aksClusterUserRoleDefinitionName = "4abbcc35-e782-43d8-92c5-2d3f1bd2253f";
export const aksClusterUserRoleName = "Azure Kubernetes Service Cluster User Role";

type AcrRoleDefinitions = [
    {
        roleDefinitionName: typeof acrPushRoleDefinitionName;
        roleName: typeof acrPushRoleName;
    },
    {
        roleDefinitionName: typeof contributorRoleDefinitionName;
        roleName: typeof contributorRoleName;
    },
];

type ClusterRoleDefinitions = [
    {
        roleDefinitionName: typeof aksClusterUserRoleDefinitionName;
        roleName: typeof aksClusterUserRoleName;
    },
    {
        roleDefinitionName: typeof contributorRoleDefinitionName;
        roleName: typeof contributorRoleName;
    },
];

export type AcrRoleDefinition = AcrRoleDefinitions[number] & { roleDefinitionId: string };
export type ClusterRoleDefinition = ClusterRoleDefinitions[number] & { roleDefinitionId: string };

export type AcrRoleDefinitionKey = Pick<AcrRoleDefinition, "roleDefinitionName">;
export type ClusterRoleDefinitionKey = Pick<ClusterRoleDefinition, "roleDefinitionName">;

export type AcrRoleDefinitionName = AcrRoleDefinition["roleDefinitionName"];
export type ClusterRoleDefinitionName = ClusterRoleDefinition["roleDefinitionName"];

export const acrRoleLookup: Record<AcrRoleDefinitionName, AcrRoleDefinitions[number]> = {
    [acrPushRoleDefinitionName]: { roleDefinitionName: acrPushRoleDefinitionName, roleName: acrPushRoleName },
    [contributorRoleDefinitionName]: {
        roleDefinitionName: contributorRoleDefinitionName,
        roleName: contributorRoleName,
    },
};

export const clusterRoleLookup: Record<ClusterRoleDefinitionName, ClusterRoleDefinitions[number]> = {
    [aksClusterUserRoleDefinitionName]: {
        roleDefinitionName: aksClusterUserRoleDefinitionName,
        roleName: aksClusterUserRoleName,
    },
    [contributorRoleDefinitionName]: {
        roleDefinitionName: contributorRoleDefinitionName,
        roleName: contributorRoleName,
    },
};

export type AcrRoleAssignmentState = {
    hasAcrPushAssignment: boolean;
};

export type ClusterRoleAssignmentState = {
    hasClusterUserAssignment: boolean;
};

export type InitialSelection = {
    subscriptionId?: string;
    acrResourceGroup?: string;
    acrName?: string;
    clusterResourceGroup?: string;
    clusterName?: string;
    repositoryOwner?: string;
    repositoryName?: string;
    branch?: string;
    entraIdApplicationId?: string;
    servicePrincipalId?: string;
};

export interface InitialState {
    repos: GitHubRepo[];
    tenantId: string;
    initialSelection: InitialSelection;
}

export type ToVsCodeMsgDef = {
    // Reference data requests
    getBranchesRequest: GitHubRepoKey;
    getOwnedApplicationsRequest: void;
    getServicePrincipalsRequest: EntraIdApplicationKey;
    getSubscriptionsRequest: void;
    getAcrsRequest: SubscriptionKey;
    getClustersRequest: SubscriptionKey;

    // Federated identity credentials requests
    getPullRequestFederatedCredentialRequest: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
    };
    getBranchFederatedCredentialRequest: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        branch: string;
    };
    createPullRequestFederatedCredentialRequest: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
    };
    createBranchFederatedCredentialRequest: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        branch: string;
    };

    // GitHub repo secrets requests
    getRepoSecretsRequest: GitHubRepoKey;
    updateRepoSecretRequest: {
        key: GitHubRepoKey;
        secret: GitHubRepoSecret;
        value: string;
    };

    // Azure resource role assignment requests
    getAcrRoleAssignmentsRequest: {
        acrKey: AcrKey;
        servicePrincipalKey: ServicePrincipalKey;
    };
    getClusterRoleAssignmentsRequest: {
        clusterKey: ClusterKey;
        servicePrincipalKey: ServicePrincipalKey;
    };
    createAcrRoleAssignmentRequest: {
        acrKey: AcrKey;
        servicePrincipalKey: ServicePrincipalKey;
        roleDefinitionKey: AcrRoleDefinitionKey;
    };
    createClusterRoleAssignmentRequest: {
        clusterKey: ClusterKey;
        servicePrincipalKey: ServicePrincipalKey;
        roleDefinitionKey: ClusterRoleDefinitionKey;
    };

    // Resource creation requests
    createEntraIdApplicationRequest: {
        applicationName: string;
    };
};

export type ToWebViewMsgDef = {
    // Reference data responses
    getBranchesResponse: {
        key: GitHubRepoKey;
        branches: string[];
    };
    getOwnedApplicationsResponse: {
        applications: EntraIdApplication[];
    };
    getServicePrincipalsResponse: {
        key: EntraIdApplicationKey;
        servicePrincipals: ServicePrincipal[];
    };
    getSubscriptionsResponse: {
        subscriptions: Subscription[];
    };
    getAcrsResponse: {
        key: SubscriptionKey;
        acrs: Acr[];
    };
    getClustersResponse: {
        key: SubscriptionKey;
        clusters: Cluster[];
    };

    // Federated identity credentials responses
    getPullRequestFederatedCredentialResponse: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        hasCredential: boolean;
    };
    getBranchFederatedCredentialResponse: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        branch: string;
        hasCredential: boolean;
    };
    createPullRequestFederatedCredentialResponse: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        hasCredential: boolean;
    };
    createBranchFederatedCredentialResponse: {
        key: EntraIdApplicationKey;
        repositoryKey: GitHubRepoKey;
        branch: string;
        hasCredential: boolean;
    };

    // GitHub repo secrets responses
    getRepoSecretsResponse: {
        key: GitHubRepoKey;
        secretState: GitHubRepoSecretState;
    };
    updateRepoSecretResponse: {
        key: GitHubRepoKey;
        secret: GitHubRepoSecret;
        secretState: GitHubRepoSecretState;
    };

    // Azure resource role assignment responses
    getAcrRoleAssignmentsResponse: {
        acrKey: AcrKey;
        servicePrincipalKey: ServicePrincipalKey;
        assignedRoleDefinitions: AcrRoleDefinition[];
    };
    getClusterRoleAssignmentsResponse: {
        clusterKey: ClusterKey;
        servicePrincipalKey: ServicePrincipalKey;
        assignedRoleDefinitions: ClusterRoleDefinition[];
    };
    createAcrRoleAssignmentResponse: {
        acrKey: AcrKey;
        servicePrincipalKey: ServicePrincipalKey;
        roleDefinitionKey: AcrRoleDefinitionKey;
        assignedRoleDefinitions: AcrRoleDefinition[];
    };
    createClusterRoleAssignmentResponse: {
        clusterKey: ClusterKey;
        servicePrincipalKey: ServicePrincipalKey;
        roleDefinitionKey: ClusterRoleDefinitionKey;
        assignedRoleDefinitions: ClusterRoleDefinition[];
    };

    // Resource creation responses
    createEntraIdApplicationResponse: {
        newApplicationName: string;
        applications: EntraIdApplication[];
        newApplication: EntraIdApplication;
        newServicePrincipal: ServicePrincipal;
    };
};

export type AuthorizeGitHubWorkflowDefinition = WebviewDefinition<InitialState, ToVsCodeMsgDef, ToWebViewMsgDef>;
