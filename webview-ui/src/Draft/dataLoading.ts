import { isNotLoaded } from "../utilities/lazy";
import { EventHandlers } from "../utilities/state";
import { AcrReferenceData, EventDef, ReferenceData, RepositoryReferenceData, ResourceGroupReferenceData, SubscriptionReferenceData, vscode } from "./state";

export function loadSubscriptions(referenceData: ReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    if (isNotLoaded(referenceData.subscriptions)) {
        vscode.postGetSubscriptionsRequest();
        eventHandlers.onSetSubscriptionsLoading();
    }
}

export function loadResourceGroups(subscriptionData: SubscriptionReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    const subscriptionId = subscriptionData.subscription.id;
    if (isNotLoaded(subscriptionData.resourceGroups)) {
        vscode.postGetResourceGroupsRequest({subscriptionId});
        eventHandlers.onSetResourceGroupsLoading({subscriptionId});
    }
}

export function loadAcrs(resourceGroupData: ResourceGroupReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    if (isNotLoaded(resourceGroupData.acrs)) {
        vscode.postGetAcrNamesRequest(resourceGroupData.key);
        eventHandlers.onSetAcrsLoading(resourceGroupData.key);
    }
}

export function loadRepositories(acrData: AcrReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    if (isNotLoaded(acrData.repositories)) {
        vscode.postGetRepositoriesRequest(acrData.key);
        eventHandlers.onSetRepositoriesLoading(acrData.key);
    }
}

export function loadBuiltTags(repositoryData: RepositoryReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    if (isNotLoaded(repositoryData.builtTags)) {
        vscode.postGetBuiltTagsRequest(repositoryData.key);
        eventHandlers.onSetBuiltTagsLoading(repositoryData.key);
    }
}

export function loadClusters(resourceGroupData: ResourceGroupReferenceData, eventHandlers: EventHandlers<EventDef>): void {
    if (isNotLoaded(resourceGroupData.clusters)) {
        vscode.postGetClustersRequest(resourceGroupData.key);
        eventHandlers.onSetClustersLoading(resourceGroupData.key);
    }
}