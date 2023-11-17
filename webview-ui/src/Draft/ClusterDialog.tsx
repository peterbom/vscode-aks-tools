import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, isLoaded, map as lazyMap, newLoading } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { AcrName, ClusterName, ResourceGroup, SavedClusterDefinition } from "../../../src/webview-contract/webviewDefinitions/draft";
import { EventHandlerFunc, loadClusters, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";
import { Maybe, hasValue, just, nothing } from "../utilities/maybe";

export interface ClusterDialogProps {
    isShown: boolean;
    subscriptionData: SubscriptionReferenceData;
    clusterDefinition: SavedClusterDefinition | null;
    eventHandlers: EventHandlers<EventDef>;
}

export function ClusterDialog(props: ClusterDialogProps) {
    const [resourceGroup, setResourceGroup] = useState(props.clusterDefinition?.resourceGroup || "");
    const [clusterName, setClusterName] = useState(props.clusterDefinition?.name || "");

    const updates: EventHandlerFunc[] = [];
    const {lazyGroups, lazyClusters} = prepareData(props.subscriptionData, resourceGroup, updates);

    useEffect(() => {
        updates.map(fn => fn(props.eventHandlers));
    });

    function canCreate() {
        // TODO:
        return resourceGroup && clusterName;
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate()) {
            return;
        }

        props.eventHandlers.onSetClusterDialogShown(false);
        props.eventHandlers.onSetCluster({
            resourceGroup,
            name: clusterName
        });
    }

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetClusterDialogShown(false)}>
            <h2>Configure Cluster</h2>
    
            <form onSubmit={handleSubmit}>
                <VSCodeDivider/>
    
                <div className={styles.inputContainer}>
                    <label htmlFor="rg-input">Resource Group</label>
                    <ResourceSelector<ResourceGroup>
                        id="rg-input"
                        className={styles.midControl}
                        resources={lazyGroups}
                        selectedItem={resourceGroup}
                        valueGetter={g => g}
                        labelGetter={g => g}
                        onSelect={g => setResourceGroup(g || "")}
                    />

                    <label htmlFor="cluster-name-input" className={styles.label}>Cluster Name</label>
                    {hasValue(lazyClusters) &&
                    <ResourceSelector<AcrName>
                        id="cluster-name-input"
                        className={styles.midControl}
                        resources={lazyClusters.value}
                        selectedItem={clusterName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={n => setClusterName(n || "")}
                    />
                    }
                </div>
    
                <VSCodeDivider/>
    
                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={!canCreate()}>Save</VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetClusterDialogShown(false)}>Cancel</VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}

type LocalData = {
    lazyGroups: Lazy<ResourceGroup[]>;
    lazyClusters: Maybe<Lazy<ClusterName[]>>;
};

function prepareData(subscriptionData: SubscriptionReferenceData, resourceGroup: ResourceGroup, updates: EventHandlerFunc[]): LocalData {
    const returnValue: LocalData = {
        lazyGroups: newLoading(),
        lazyClusters: resourceGroup ? just(newLoading()) : nothing()
    };

    const resourceGroupsData = subscriptionData.resourceGroups;
    returnValue.lazyGroups = lazyMap(resourceGroupsData, data => data.map(g => g.key.resourceGroup));
    if (!isLoaded(resourceGroupsData)) {
        updates.push(loadResourceGroups(subscriptionData));
        return returnValue;
    }

    if (resourceGroup) {
        const resourceGroupData = getOrThrow(resourceGroupsData.value, g => g.key.resourceGroup === resourceGroup, `${resourceGroup} not found`);
        const clustersData = resourceGroupData.clusters;
        returnValue.lazyClusters = just(lazyMap(clustersData, data => data.map(g => g.key.clusterName)));
        if (!isLoaded(clustersData)) {
            updates.push(loadClusters(resourceGroupData));
        }
    }

    return returnValue;
}