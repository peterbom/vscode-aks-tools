import { isNotLoaded } from "../utilities/lazy";
import { EventHandlers } from "../utilities/state";
import {
    AcrReferenceData,
    ClusterReferenceData,
    EventDef,
    ReferenceData,
    RepositoryReferenceData,
    ResourceGroupReferenceData,
    SubscriptionReferenceData,
    vscode,
} from "./state";

export type EventHandlerFunc = (eventHandlers: EventHandlers<EventDef>) => void;

export const noop: EventHandlerFunc = () => {};

export function loadSubscriptions(referenceData: ReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(referenceData.subscriptions)) {
        vscode.postGetSubscriptionsRequest();
        updates.push((e) => e.onSetSubscriptionsLoading());
    }
}

export function loadResourceGroups(subscriptionData: SubscriptionReferenceData, updates: EventHandlerFunc[]): void {
    const subscriptionId = subscriptionData.subscription.id;
    if (isNotLoaded(subscriptionData.resourceGroups)) {
        vscode.postGetResourceGroupsRequest({ subscriptionId });
        updates.push((e) => e.onSetResourceGroupsLoading({ subscriptionId }));
    }
}

export function loadAcrs(resourceGroupData: ResourceGroupReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(resourceGroupData.acrs)) {
        vscode.postGetAcrNamesRequest(resourceGroupData.key);
        updates.push((e) => e.onSetAcrsLoading(resourceGroupData.key));
    }
}

export function loadRepositories(acrData: AcrReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(acrData.repositories)) {
        vscode.postGetRepositoriesRequest(acrData.key);
        updates.push((e) => e.onSetRepositoriesLoading(acrData.key));
    }
}

export function loadBuiltTags(repositoryData: RepositoryReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(repositoryData.builtTags)) {
        vscode.postGetBuiltTagsRequest(repositoryData.key);
        updates.push((e) => e.onSetBuiltTagsLoading(repositoryData.key));
    }
}

export function loadClusters(resourceGroupData: ResourceGroupReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(resourceGroupData.clusters)) {
        vscode.postGetClustersRequest(resourceGroupData.key);
        updates.push((e) => e.onSetClustersLoading(resourceGroupData.key));
    }
}

export function loadConnectedAcrs(clusterData: ClusterReferenceData, updates: EventHandlerFunc[]): void {
    if (isNotLoaded(clusterData.connectedAcrs)) {
        vscode.postGetConnectedAcrsRequest(clusterData.key);
        updates.push((e) => e.onSetConnectedAcrsLoading(clusterData.key));
    }
}
