import {
    Acr,
    AcrKey,
    AcrRoleDefinition,
    Cluster,
    ClusterKey,
    ClusterRoleDefinition,
    EntraIdApplication,
    EntraIdApplicationKey,
    GitHubRepo,
    GitHubRepoKey,
    GitHubRepoSecret,
    GitHubRepoSecretState,
    ServicePrincipal,
    ServicePrincipalKey,
    Subscription,
} from "../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { getOrThrow } from "../../utilities/array";
import { Lazy, isLoaded, isNotLoaded, map as lazyMap, newNotLoaded } from "../../utilities/lazy";
import { EventHandlers } from "../../utilities/state";
import {
    AcrReferenceData,
    ApplicationReferenceData,
    AzureReferenceData,
    ClusterReferenceData,
    GitHubReferenceData,
    GitHubRepoBranchStringKey,
    GitHubRepoStringKey,
    GitHubRepositoryReferenceData,
    LazyProperties,
    SubscriptionReferenceData,
} from "../state/stateTypes";
import { EventDef, vscode } from "./state";

export type EventHandlerFunc = (eventHandlers: EventHandlers<EventDef>) => void;

export function ensureGitHubRepoBranchNamesLoaded(
    referenceData: GitHubReferenceData,
    repo: GitHubRepo | null,
    updates: EventHandlerFunc[],
): Lazy<string[]> {
    const repoData = getGitHubRepoReferenceData(referenceData, repo);
    if (repoData === null) {
        return newNotLoaded();
    }

    if (isNotLoaded(repoData.branches)) {
        const key: GitHubRepoKey = {
            gitHubRepoOwner: repoData.repository.gitHubRepoOwner,
            gitHubRepoName: repoData.repository.gitHubRepoName,
        };

        vscode.postGetBranchesRequest(key);
        updates.push((e) => e.onSetBranchesLoading(key));
    }

    return repoData.branches;
}

export function ensureGitHubRepoSecretStateLoaded(
    referenceData: GitHubReferenceData,
    repo: GitHubRepo | null,
    updates: EventHandlerFunc[],
): LazyProperties<GitHubRepoSecretState> {
    const repoData = getGitHubRepoReferenceData(referenceData, repo);
    if (repoData === null) {
        return { CLIENT_ID: newNotLoaded(), TENANT_ID: newNotLoaded(), SUBSCRIPTION_ID: newNotLoaded() };
    }

    const key: GitHubRepoKey = {
        gitHubRepoOwner: repoData.repository.gitHubRepoOwner,
        gitHubRepoName: repoData.repository.gitHubRepoName,
    };

    Object.keys(repoData.secretState).forEach((secretName) => {
        const secret = secretName as GitHubRepoSecret;
        if (isNotLoaded(repoData.secretState[secret])) {
            updates.push((e) => e.onSetSecretLoading({ key, secret }));
        }
    });

    const anySecretsNotLoaded = Object.values(repoData.secretState).some(isNotLoaded);
    if (anySecretsNotLoaded) {
        vscode.postGetRepoSecretsRequest(key);
    }

    return repoData.secretState;
}

export function ensureOwnedApplicationsLoaded(
    referenceData: AzureReferenceData,
    updates: EventHandlerFunc[],
): Lazy<EntraIdApplication[]> {
    if (isNotLoaded(referenceData.ownedApplications)) {
        vscode.postGetOwnedApplicationsRequest();
        updates.push((e) => e.onSetOwnedApplicationsLoading());
    }

    return lazyMap(referenceData.ownedApplications, (data) => data.map((a) => a.application));
}

export function ensureServicePrincipalsLoaded(
    referenceData: AzureReferenceData,
    application: EntraIdApplication | null,
    updates: EventHandlerFunc[],
): Lazy<ServicePrincipal[]> {
    const applicationData = getApplicationReferenceData(referenceData, application);
    if (applicationData === null) {
        return newNotLoaded();
    }

    if (isNotLoaded(applicationData.servicePrincipals)) {
        const key: EntraIdApplicationKey = {
            objectId: applicationData.application.objectId,
            clientId: applicationData.application.clientId,
        };

        vscode.postGetServicePrincipalsRequest(key);
        updates.push((e) => e.onSetServicePrincipalsLoading(key));
    }

    return applicationData.servicePrincipals;
}

export function ensurePullRequestFederatedCredentialLoaded(
    referenceData: AzureReferenceData,
    application: EntraIdApplication | null,
    repo: GitHubRepo | null,
    updates: EventHandlerFunc[],
): Lazy<boolean> {
    const applicationData = getApplicationReferenceData(referenceData, application);
    if (applicationData === null) {
        return newNotLoaded();
    }

    if (repo === null) {
        return newNotLoaded();
    }

    const key: EntraIdApplicationKey = {
        objectId: applicationData.application.objectId,
        clientId: applicationData.application.clientId,
    };

    const stateKey: GitHubRepoStringKey = `${repo.gitHubRepoOwner}/${repo.gitHubRepoName}`;
    const hasCredential = applicationData.pullRequestFederatedCredentialState[stateKey] || newNotLoaded();
    if (isNotLoaded(hasCredential)) {
        updates.push((e) => e.onSetPullRequestFederatedCredentialLoading({ key, repositoryKey: repo }));
        vscode.postGetPullRequestFederatedCredentialRequest({ key, repositoryKey: repo });
    }

    return hasCredential;
}

export function ensureBranchFederatedCredentialLoaded(
    referenceData: AzureReferenceData,
    application: EntraIdApplication | null,
    repo: GitHubRepo | null,
    branch: string | null,
    updates: EventHandlerFunc[],
): Lazy<boolean> {
    const applicationData = getApplicationReferenceData(referenceData, application);
    if (applicationData === null) {
        return newNotLoaded();
    }

    if (repo === null || branch === null) {
        return newNotLoaded();
    }

    const key: EntraIdApplicationKey = {
        objectId: applicationData.application.objectId,
        clientId: applicationData.application.clientId,
    };

    const stateKey: GitHubRepoBranchStringKey = `${repo.gitHubRepoOwner}/${repo.gitHubRepoName}/${branch}`;
    const hasCredential = applicationData.branchFederatedCredentialState[stateKey] || newNotLoaded();
    if (isNotLoaded(hasCredential)) {
        updates.push((e) => e.onSetBranchFederatedCredentialLoading({ key, repositoryKey: repo, branch }));
        vscode.postGetBranchFederatedCredentialRequest({ key, repositoryKey: repo, branch });
    }

    return hasCredential;
}

export function ensureSubscriptionsLoaded(
    referenceData: AzureReferenceData,
    updates: EventHandlerFunc[],
): Lazy<Subscription[]> {
    if (isNotLoaded(referenceData.subscriptions)) {
        vscode.postGetSubscriptionsRequest();
        updates.push((e) => e.onSetSubscriptionsLoading());
    }

    return lazyMap(referenceData.subscriptions, (data) => data.map((s) => s.subscription));
}

export function ensureAcrsLoaded(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    updates: EventHandlerFunc[],
): Lazy<Acr[]> {
    const subscriptionData = getSubscriptionReferenceData(referenceData, subscription);
    if (subscriptionData === null) {
        return newNotLoaded();
    }

    if (isNotLoaded(subscriptionData.acrs)) {
        const key = { subscriptionId: subscriptionData.subscription.subscriptionId };
        vscode.postGetAcrsRequest(key);
        updates.push((e) => e.onSetAcrsLoading(key));
    }

    return lazyMap(subscriptionData.acrs, (data) => data.map((a) => a.acr));
}

export function ensureClustersLoaded(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    updates: EventHandlerFunc[],
): Lazy<Cluster[]> {
    const subscriptionData = getSubscriptionReferenceData(referenceData, subscription);
    if (subscriptionData === null) {
        return newNotLoaded();
    }

    if (isNotLoaded(subscriptionData.clusters)) {
        const key = { subscriptionId: subscriptionData.subscription.subscriptionId };
        vscode.postGetClustersRequest(key);
        updates.push((e) => e.onSetClustersLoading(key));
    }

    return lazyMap(subscriptionData.clusters, (data) => data.map((c) => c.cluster));
}

export function ensureAcrRoleAssignmentsLoaded(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    acr: Acr | null,
    application: EntraIdApplication | null,
    servicePrincipal: ServicePrincipal | null,
    updates: EventHandlerFunc[],
): Lazy<AcrRoleDefinition[]> {
    const acrData = getAcrReferenceData(referenceData, subscription, acr);
    if (acrData === null) {
        return newNotLoaded();
    }

    const applicationData = getApplicationReferenceData(referenceData, application);
    if (applicationData === null) {
        return newNotLoaded();
    }

    if (servicePrincipal === null) {
        return newNotLoaded();
    }

    const assignedRoleDefinitions: Lazy<AcrRoleDefinition[]> =
        acrData.assignedRoleDefinitions[servicePrincipal.servicePrincipalId] || newNotLoaded();

    if (isNotLoaded(assignedRoleDefinitions)) {
        const acrKey: AcrKey = {
            subscriptionId: acrData.acr.subscriptionId,
            resourceGroup: acrData.acr.resourceGroup,
            acrName: acrData.acr.acrName,
        };

        const servicePrincipalKey: ServicePrincipalKey = {
            servicePrincipalId: servicePrincipal.servicePrincipalId,
        };

        vscode.postGetAcrRoleAssignmentsRequest({ acrKey, servicePrincipalKey });
        updates.push((e) => e.onSetAcrRoleAssignmentsLoading({ acrKey, servicePrincipalKey }));
    }

    return assignedRoleDefinitions;
}

export function ensureClusterRoleAssignmentsLoaded(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    cluster: Cluster | null,
    application: EntraIdApplication | null,
    servicePrincipal: ServicePrincipal | null,
    updates: EventHandlerFunc[],
): Lazy<ClusterRoleDefinition[]> {
    const clusterData = getClusterReferenceData(referenceData, subscription, cluster);
    if (clusterData === null) {
        return newNotLoaded();
    }

    const applicationData = getApplicationReferenceData(referenceData, application);
    if (applicationData === null) {
        return newNotLoaded();
    }

    if (servicePrincipal === null) {
        return newNotLoaded();
    }

    const assignedRoleDefinitions: Lazy<ClusterRoleDefinition[]> =
        clusterData.assignedRoleDefinitions[servicePrincipal.servicePrincipalId] || newNotLoaded();

    if (isNotLoaded(assignedRoleDefinitions)) {
        const clusterKey: ClusterKey = {
            subscriptionId: clusterData.cluster.subscriptionId,
            resourceGroup: clusterData.cluster.resourceGroup,
            clusterName: clusterData.cluster.clusterName,
        };

        const servicePrincipalKey: ServicePrincipalKey = {
            servicePrincipalId: servicePrincipal.servicePrincipalId,
        };

        vscode.postGetClusterRoleAssignmentsRequest({ clusterKey, servicePrincipalKey });
        updates.push((e) => e.onSetClusterRoleAssignmentsLoading({ clusterKey, servicePrincipalKey }));
    }

    return assignedRoleDefinitions;
}

function getGitHubRepoReferenceData(
    referenceData: GitHubReferenceData,
    repo: GitHubRepo | null,
): GitHubRepositoryReferenceData | null {
    if (repo === null) {
        return null;
    }

    return getOrThrow(
        referenceData.repositories,
        (repoData) =>
            repoData.repository.gitHubRepoOwner === repo.gitHubRepoOwner &&
            repoData.repository.gitHubRepoName === repo.gitHubRepoName,
        `${repo.gitHubRepoName} not found`,
    );
}

function getSubscriptionReferenceData(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
): SubscriptionReferenceData | null {
    if (!isLoaded(referenceData.subscriptions) || subscription === null) {
        return null;
    }

    return getOrThrow(
        referenceData.subscriptions.value,
        (s) => s.subscription.subscriptionId === subscription.subscriptionId,
        `${subscription.subscriptionId} (${subscription.name}) not found`,
    );
}

function getAcrReferenceData(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    acr: Acr | null,
): AcrReferenceData | null {
    const subscriptionData = getSubscriptionReferenceData(referenceData, subscription);
    if (subscriptionData === null || !isLoaded(subscriptionData.acrs)) {
        return null;
    }

    if (subscription === null || acr === null) {
        return null;
    }

    return getOrThrow(
        subscriptionData.acrs.value,
        (data) => data.acr.resourceGroup === acr.resourceGroup && data.acr.acrName === acr.acrName,
        `${acr.acrName} not found`,
    );
}

function getClusterReferenceData(
    referenceData: AzureReferenceData,
    subscription: Subscription | null,
    cluster: Cluster | null,
): ClusterReferenceData | null {
    const resourceGroupData = getSubscriptionReferenceData(referenceData, subscription);
    if (resourceGroupData === null || !isLoaded(resourceGroupData.clusters)) {
        return null;
    }

    if (subscription === null || cluster === null) {
        return null;
    }

    return getOrThrow(
        resourceGroupData.clusters.value,
        (data) =>
            data.cluster.resourceGroup === cluster.resourceGroup && data.cluster.clusterName === cluster.clusterName,
        `${cluster.clusterName} not found`,
    );
}

function getApplicationReferenceData(
    referenceData: AzureReferenceData,
    application: EntraIdApplication | null,
): ApplicationReferenceData | null {
    if (!isLoaded(referenceData.ownedApplications) || application === null) {
        return null;
    }

    return getOrThrow(
        referenceData.ownedApplications.value,
        (a) => a.application.objectId === application.objectId,
        `${application.objectId} (${application.applicationName}) not found`,
    );
}
