import {
    AcrKey,
    AcrRoleDefinition,
    ClusterKey,
    ClusterRoleDefinition,
    EntraIdApplication,
    GitHubRepoKey,
    ServicePrincipal,
    Subscription,
} from "../../../../../src/webview-contract/webviewDefinitions/authorizeGitHubWorkflow";
import { replaceItem, updateValues } from "../../../utilities/array";
import { map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../../../utilities/lazy";
import { ApplicationReferenceData, AzureReferenceData, SubscriptionReferenceData } from "../stateTypes";
import * as SubscriptionDataUpdate from "./subscriptionDataUpdate";

export function setOwnedApplicationsLoading(data: AzureReferenceData): AzureReferenceData {
    return { ...data, ownedApplications: newLoading() };
}

export function updateOwnedApplications(
    data: AzureReferenceData,
    newApplications: EntraIdApplication[],
): AzureReferenceData {
    const existingOwnedApplications = orDefault(data.ownedApplications, []);
    const updatedOwnedApplications = updateValues(
        existingOwnedApplications,
        newApplications,
        (app, appData) => app.objectId === appData.application.objectId,
        (app) => ({
            application: app,
            pullRequestFederatedCredentialState: {},
            branchFederatedCredentialState: {},
            servicePrincipals: newNotLoaded(),
        }),
    );

    return {
        ...data,
        ownedApplications: newLoaded(updatedOwnedApplications),
    };
}

export function setServicePrincipalsLoading(data: AzureReferenceData, applicationId: string): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({ ...appData, servicePrincipals: newLoading() }));
}

export function updateServicePrincipals(
    data: AzureReferenceData,
    applicationId: string,
    servicePrincipals: ServicePrincipal[],
): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({
        ...appData,
        servicePrincipals: newLoaded(servicePrincipals),
    }));
}

export function setPullRequestFederatedCredentialLoading(
    data: AzureReferenceData,
    applicationId: string,
    repo: GitHubRepoKey,
): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({
        ...appData,
        pullRequestFederatedCredentialState: {
            ...appData.pullRequestFederatedCredentialState,
            [`${repo.gitHubRepoOwner}/${repo.gitHubRepoName}`]: newLoading(),
        },
    }));
}

export function setBranchFederatedCredentialLoading(
    data: AzureReferenceData,
    applicationId: string,
    repo: GitHubRepoKey,
    branch: string,
): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({
        ...appData,
        branchFederatedCredentialState: {
            ...appData.branchFederatedCredentialState,
            [`${repo.gitHubRepoOwner}/${repo.gitHubRepoName}/${branch}`]: newLoading(),
        },
    }));
}

export function updatePullRequestFederatedCredentialState(
    data: AzureReferenceData,
    applicationId: string,
    repo: GitHubRepoKey,
    hasCredential: boolean,
): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({
        ...appData,
        pullRequestFederatedCredentialState: {
            ...appData.pullRequestFederatedCredentialState,
            [`${repo.gitHubRepoOwner}/${repo.gitHubRepoName}`]: newLoaded(hasCredential),
        },
    }));
}

export function updateBranchFederatedCredentialState(
    data: AzureReferenceData,
    applicationId: string,
    repo: GitHubRepoKey,
    branch: string,
    hasCredential: boolean,
): AzureReferenceData {
    return updateApplication(data, applicationId, (appData) => ({
        ...appData,
        branchFederatedCredentialState: {
            ...appData.branchFederatedCredentialState,
            [`${repo.gitHubRepoOwner}/${repo.gitHubRepoName}/${branch}`]: newLoaded(hasCredential),
        },
    }));
}

export function setSubscriptionsLoading(data: AzureReferenceData): AzureReferenceData {
    return { ...data, subscriptions: newLoading() };
}

export function updateSubscriptions(data: AzureReferenceData, subscriptions: Subscription[]): AzureReferenceData {
    const existingSubs = orDefault(data.subscriptions, []);
    const updatedSubs = updateValues(
        existingSubs,
        subscriptions,
        (sub, subData) => sub.subscriptionId === subData.subscription.subscriptionId,
        (subscription) => ({
            subscription,
            acrs: newNotLoaded(),
            clusters: newNotLoaded(),
        }),
    );

    return {
        ...data,
        subscriptions: newLoaded(updatedSubs),
    };
}

export function setAcrsLoading(data: AzureReferenceData, subscriptionId: string): AzureReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => ({ ...sub, acrs: newLoading() }));
}

export function updateAcrs(data: AzureReferenceData, subscriptionId: string, acrKeys: AcrKey[]): AzureReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => SubscriptionDataUpdate.updateAcrs(sub, acrKeys));
}

export function setClustersLoading(data: AzureReferenceData, subscriptionId: string): AzureReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => ({ ...sub, clusters: newLoading() }));
}

export function updateClusters(
    data: AzureReferenceData,
    subscriptionId: string,
    clusterKeys: ClusterKey[],
): AzureReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => SubscriptionDataUpdate.updateClusters(sub, clusterKeys));
}

export function setAcrRoleAssignmentsLoading(
    data: AzureReferenceData,
    acrKey: AcrKey,
    servicePrincipalId: string,
): AzureReferenceData {
    return updateSubscription(data, acrKey.subscriptionId, (sub) =>
        SubscriptionDataUpdate.setAcrRoleAssignmentsLoading(sub, acrKey, servicePrincipalId),
    );
}

export function setClusterRoleAssignmentsLoading(
    data: AzureReferenceData,
    clusterKey: ClusterKey,
    servicePrincipalId: string,
): AzureReferenceData {
    return updateSubscription(data, clusterKey.subscriptionId, (sub) =>
        SubscriptionDataUpdate.setClusterRoleAssignmentsLoading(sub, clusterKey, servicePrincipalId),
    );
}

export function updateAcrRoleAssignments(
    data: AzureReferenceData,
    acrKey: AcrKey,
    servicePrincipalId: string,
    assignedRoleDefinitions: AcrRoleDefinition[],
): AzureReferenceData {
    return updateSubscription(data, acrKey.subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateAcrRoleAssignments(sub, acrKey, servicePrincipalId, assignedRoleDefinitions),
    );
}

export function updateClusterRoleAssignments(
    data: AzureReferenceData,
    clusterKey: ClusterKey,
    servicePrincipalId: string,
    assignedRoleDefinitions: ClusterRoleDefinition[],
): AzureReferenceData {
    return updateSubscription(data, clusterKey.subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateClusterRoleAssignments(
            sub,
            clusterKey,
            servicePrincipalId,
            assignedRoleDefinitions,
        ),
    );
}

function updateApplication(
    data: AzureReferenceData,
    applicationObjectId: string,
    updater: (data: ApplicationReferenceData) => ApplicationReferenceData,
): AzureReferenceData {
    return {
        ...data,
        ownedApplications: lazyMap(data.ownedApplications, (acrs) =>
            replaceItem(acrs, (data) => data.application.objectId === applicationObjectId, updater),
        ),
    };
}

function updateSubscription(
    data: AzureReferenceData,
    subscriptionId: string,
    updater: (data: SubscriptionReferenceData) => SubscriptionReferenceData,
): AzureReferenceData {
    return {
        ...data,
        subscriptions: lazyMap(data.subscriptions, (subs) =>
            replaceItem(subs, (subData) => subData.subscription.subscriptionId === subscriptionId, updater),
        ),
    };
}
