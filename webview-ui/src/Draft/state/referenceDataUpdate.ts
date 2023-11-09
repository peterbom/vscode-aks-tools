import {
    AcrKey,
    AcrName,
    ClusterName,
    RepositoryName,
    ResourceGroup,
    Subscription,
} from "../../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem, updateValues } from "../../utilities/array";
import { map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../../utilities/lazy";
import { ReferenceData, SubscriptionReferenceData } from "../state";
import * as SubscriptionDataUpdate from "./subscriptionDataUpdate";

export function setSubscriptionsLoading(data: ReferenceData): ReferenceData {
    return { ...data, subscriptions: newLoading() };
}

export function updateSubscriptions(data: ReferenceData, subscriptions: Subscription[]): ReferenceData {
    const existingSubs = orDefault(data.subscriptions, []);
    const updatedSubs = updateValues(
        existingSubs,
        subscriptions,
        (sub) => sub.subscription,
        (subscription) => ({
            subscription,
            resourceGroups: newNotLoaded(),
        }),
    );

    return {
        ...data,
        subscriptions: newLoaded(updatedSubs),
    };
}

export function setResourceGroupsLoading(data: ReferenceData, subscriptionId: string): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => SubscriptionDataUpdate.setResourceGroupsLoading(sub));
}

export function updateResourceGroups(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroups: ResourceGroup[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateResourceGroups(sub, resourceGroups),
    );
}

export function setAcrsLoading(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) => SubscriptionDataUpdate.setAcrsLoading(sub, resourceGroup));
}

export function updateAcrNames(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    acrNames: AcrName[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateAcrNames(sub, resourceGroup, acrNames),
    );
}

export function setRepositoriesLoading(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.setRepositoriesLoading(sub, resourceGroup, acrName),
    );
}

export function updateRepositoryNames(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryNames: RepositoryName[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateRepositoryNames(sub, resourceGroup, acrName, repositoryNames),
    );
}

export function setBuiltTagsLoading(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryName: RepositoryName,
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.setBuiltTagsLoading(sub, resourceGroup, acrName, repositoryName),
    );
}

export function updateBuiltTags(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryName: RepositoryName,
    tags: string[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateBuiltTags(sub, resourceGroup, acrName, repositoryName, tags),
    );
}

export function setClustersLoading(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.setClustersLoading(sub, resourceGroup),
    );
}

export function updateClusterNames(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    clusterNames: ClusterName[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateClusterNames(sub, resourceGroup, clusterNames),
    );
}

export function setConnectedAcrsLoading(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    clusterName: ClusterName,
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.setConnectedAcrsLoading(sub, resourceGroup, clusterName),
    );
}

export function updateConnectedAcrs(
    data: ReferenceData,
    subscriptionId: string,
    resourceGroup: ResourceGroup,
    clusterName: ClusterName,
    acrs: AcrKey[],
): ReferenceData {
    return updateSubscription(data, subscriptionId, (sub) =>
        SubscriptionDataUpdate.updateConnectedAcrs(sub, resourceGroup, clusterName, acrs),
    );
}

function updateSubscription(
    data: ReferenceData,
    subscriptionId: string,
    updater: (data: SubscriptionReferenceData) => SubscriptionReferenceData,
): ReferenceData {
    return {
        ...data,
        subscriptions: lazyMap(data.subscriptions, (subs) =>
            replaceItem(subs, (sub) => sub.subscription.id === subscriptionId, updater),
        ),
    };
}
