import { isNotLoaded } from "../utilities/lazy";
import { EventHandlers } from "../utilities/state";
import { AcrReferenceData, EventDef, ReferenceData, RepositoryReferenceData, ResourceGroupReferenceData, SubscriptionReferenceData, vscode } from "./state";

export type EventHandlerFunc = (eventHandlers: EventHandlers<EventDef>) => void;

export const noop: EventHandlerFunc = () => {};

export function loadSubscriptions(referenceData: ReferenceData): EventHandlerFunc {
    if (isNotLoaded(referenceData.subscriptions)) {
        vscode.postGetSubscriptionsRequest();
        return e => e.onSetSubscriptionsLoading();
    }

    return noop;
}

export function loadResourceGroups(subscriptionData: SubscriptionReferenceData): EventHandlerFunc {
    const subscriptionId = subscriptionData.subscription.id;
    if (isNotLoaded(subscriptionData.resourceGroups)) {
        vscode.postGetResourceGroupsRequest({subscriptionId});
        return e => e.onSetResourceGroupsLoading({subscriptionId});
    }

    return noop;
}

export function loadAcrs(resourceGroupData: ResourceGroupReferenceData): EventHandlerFunc {
    if (isNotLoaded(resourceGroupData.acrs)) {
        vscode.postGetAcrNamesRequest(resourceGroupData.key);
        return e => e.onSetAcrsLoading(resourceGroupData.key);
    }

    return noop;
}

export function loadRepositories(acrData: AcrReferenceData): EventHandlerFunc {
    if (isNotLoaded(acrData.repositories)) {
        vscode.postGetRepositoriesRequest(acrData.key);
        return e => e.onSetRepositoriesLoading(acrData.key);
    }

    return noop;
}

export function loadBuiltTags(repositoryData: RepositoryReferenceData): EventHandlerFunc {
    if (isNotLoaded(repositoryData.builtTags)) {
        vscode.postGetBuiltTagsRequest(repositoryData.key);
        return e => e.onSetBuiltTagsLoading(repositoryData.key);
    }

    return noop;
}

export function loadClusters(resourceGroupData: ResourceGroupReferenceData): EventHandlerFunc {
    if (isNotLoaded(resourceGroupData.clusters)) {
        vscode.postGetClustersRequest(resourceGroupData.key);
        return e => e.onSetClustersLoading(resourceGroupData.key);
    }

    return noop;
}