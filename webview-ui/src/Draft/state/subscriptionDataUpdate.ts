import {
    AcrKey,
    AcrName,
    ClusterName,
    RepositoryName,
    ResourceGroup,
    ResourceGroupKey,
} from "../../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem, updateValues } from "../../utilities/array";
import { map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../../utilities/lazy";
import { ResourceGroupReferenceData, SubscriptionReferenceData } from "../state";
import * as ResourceGroupDataUpdate from "./resourceGroupDataUpdate";

export function setResourceGroupsLoading(data: SubscriptionReferenceData): SubscriptionReferenceData {
    return { ...data, resourceGroups: newLoading() };
}

export function updateResourceGroups(
    data: SubscriptionReferenceData,
    resourceGroups: ResourceGroup[],
): SubscriptionReferenceData {
    const existingGroups = orDefault(data.resourceGroups, []);
    const newKeys: ResourceGroupKey[] = resourceGroups.map((resourceGroup) => ({
        subscriptionId: data.subscription.id,
        resourceGroup,
    }));
    const updatedGroups = updateValues(
        existingGroups,
        newKeys,
        (group) => group.key,
        (key) => ({
            key,
            acrs: newNotLoaded(),
            clusters: newNotLoaded(),
        }),
    );

    return {
        ...data,
        resourceGroups: newLoaded(updatedGroups),
    };
}

export function setAcrsLoading(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) => ResourceGroupDataUpdate.setAcrsLoading(group));
}

export function updateAcrNames(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrNames: AcrName[],
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) => ResourceGroupDataUpdate.updateAcrNames(group, acrNames));
}

export function setRepositoriesLoading(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.setRepositoriesLoading(group, acrName),
    );
}

export function updateRepositoryNames(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryNames: RepositoryName[],
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.updateRepositoryNames(group, acrName, repositoryNames),
    );
}

export function setBuiltTagsLoading(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryName: RepositoryName,
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.setBuiltTagsLoading(group, acrName, repositoryName),
    );
}

export function updateBuiltTags(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    repositoryName: RepositoryName,
    tags: string[],
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.updateBuiltTags(group, acrName, repositoryName, tags),
    );
}

export function setClustersLoading(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) => ResourceGroupDataUpdate.setClustersLoading(group));
}

export function updateClusterNames(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    clusterNames: ClusterName[],
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.updateClusterNames(group, clusterNames),
    );
}

export function setConnectedAcrsLoading(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    clusterName: ClusterName,
) {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.setConnectedAcrsLoading(group, clusterName),
    );
}

export function updateConnectedAcrs(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    clusterName: ClusterName,
    acrs: AcrKey[],
): SubscriptionReferenceData {
    return updateResourceGroup(data, resourceGroup, (group) =>
        ResourceGroupDataUpdate.updateConnectedAcrs(group, clusterName, acrs),
    );
}

function updateResourceGroup(
    data: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    updater: (data: ResourceGroupReferenceData) => ResourceGroupReferenceData,
): SubscriptionReferenceData {
    return {
        ...data,
        resourceGroups: lazyMap(data.resourceGroups, (groups) =>
            replaceItem(groups, (group) => group.key.resourceGroup === resourceGroup, updater),
        ),
    };
}
