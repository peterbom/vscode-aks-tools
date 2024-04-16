import {
    Acr,
    AcrRoleDefinition,
    Cluster,
    ClusterRoleDefinition,
    EntraIdApplication,
    GitHubRepo,
    GitHubRepoSecretState,
    ServicePrincipal,
    Subscription,
} from "../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { Lazy } from "../../utilities/lazy";

export type AzureReferenceData = {
    tenantId: string;
    ownedApplications: Lazy<ApplicationReferenceData[]>;
    subscriptions: Lazy<SubscriptionReferenceData[]>;
};

export type GitHubRepoStringKey = `${string}/${string}`;
export type GitHubRepoBranchStringKey = `${string}/${string}/${string}`;

export type ApplicationReferenceData = {
    application: EntraIdApplication;
    pullRequestFederatedCredentialState: {
        [repo: GitHubRepoStringKey]: Lazy<boolean>;
    };
    branchFederatedCredentialState: {
        [branch: GitHubRepoBranchStringKey]: Lazy<boolean>;
    };
    servicePrincipals: Lazy<ServicePrincipal[]>;
};

export type SubscriptionReferenceData = {
    subscription: Subscription;
    acrs: Lazy<AcrReferenceData[]>;
    clusters: Lazy<ClusterReferenceData[]>;
};

export type AcrReferenceData = {
    acr: Acr;
    assignedRoleDefinitions: {
        [servicePrincipalId: string]: Lazy<AcrRoleDefinition[]>;
    };
};

export type ClusterReferenceData = {
    cluster: Cluster;
    assignedRoleDefinitions: {
        [servicePrincipalId: string]: Lazy<ClusterRoleDefinition[]>;
    };
};

export type GitHubReferenceData = {
    repositories: GitHubRepositoryReferenceData[];
};

export type LazyProperties<T> = {
    [K in keyof T]: Lazy<T[K]>;
};

export type GitHubRepositoryReferenceData = {
    repository: GitHubRepo;
    secretState: LazyProperties<GitHubRepoSecretState>;
    branches: Lazy<string[]>;
};
