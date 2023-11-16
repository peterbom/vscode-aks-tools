import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, isLoaded, map as lazyMap, newNotLoaded } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { AcrName, ClusterName, ResourceGroup, SavedClusterDefinition } from "../../../src/webview-contract/webviewDefinitions/draft";
import { loadClusters, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";

export interface ClusterDialogProps {
    isShown: boolean;
    subscriptionData: SubscriptionReferenceData;
    clusterDefinition: SavedClusterDefinition | null;
    eventHandlers: EventHandlers<EventDef>;
}

export function ClusterDialog(props: ClusterDialogProps) {
    const [resourceGroup, setResourceGroup] = useState(props.clusterDefinition?.resourceGroup || "");
    const [clusterName, setClusterName] = useState(props.clusterDefinition?.name || "");

    let lazyGroups: Lazy<ResourceGroup[]> = newNotLoaded();
    let lazyClusters: Lazy<ClusterName[]> = newNotLoaded();

    (function prepareData() {
        const resourceGroupsData = props.subscriptionData.resourceGroups;
        lazyGroups = lazyMap(resourceGroupsData, data => data.map(g => g.key.resourceGroup));
        if (!isLoaded(resourceGroupsData)) {
            loadResourceGroups(props.subscriptionData, props.eventHandlers);
            return;
        }
    
        if (resourceGroup) {
            const resourceGroupData = getOrThrow(resourceGroupsData.value, g => g.key.resourceGroup === resourceGroup, `${resourceGroup} not found`);
            const clustersData = resourceGroupData.clusters;
            lazyClusters = lazyMap(clustersData, data => data.map(g => g.key.clusterName));
            if (!isLoaded(clustersData)) {
                loadClusters(resourceGroupData, props.eventHandlers);
                return;
            }
        }
    })();

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
                    <ResourceSelector<AcrName>
                        id="cluster-name-input"
                        className={styles.midControl}
                        resources={lazyClusters}
                        selectedItem={clusterName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={n => setClusterName(n || "")}
                    />
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