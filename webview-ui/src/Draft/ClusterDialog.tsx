import { FormEvent, useEffect } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, isLoaded, map as lazyMap, newLoading } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import {
    AcrName,
    ClusterName,
    ResourceGroup,
    SavedClusterDefinition,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import { EventHandlerFunc, loadClusters, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";
import { Maybe, hasValue, isNothing, just, nothing } from "../utilities/maybe";
import { DialogState } from "./state/dialogs";

export interface ClusterDialogProps {
    state: DialogState<"cluster">;
    subscriptionData: SubscriptionReferenceData;
    eventHandlers: EventHandlers<EventDef>;
}

export function ClusterDialog(props: ClusterDialogProps) {
    const updates: EventHandlerFunc[] = [];
    const { lazyGroups, lazyClusters } = prepareData(
        props.subscriptionData,
        props.state.content.resourceGroup,
        updates,
    );

    useEffect(() => {
        updates.map((fn) => fn(props.eventHandlers));
    });

    function validate(): Maybe<SavedClusterDefinition> {
        if (!props.state.content.resourceGroup) return nothing();
        if (!props.state.content.name) return nothing();

        return just({
            resourceGroup: props.state.content.resourceGroup,
            name: props.state.content.name,
        });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const clusterDefinition = validate();
        if (isNothing(clusterDefinition)) {
            return;
        }

        props.eventHandlers.onSetDialogVisibility({ dialog: "cluster", shown: false });
        props.eventHandlers.onSetCluster(clusterDefinition.value);
    }

    return (
        <Dialog
            isShown={props.state.shown}
            onCancel={() => props.eventHandlers.onSetDialogVisibility({ dialog: "cluster", shown: false })}
        >
            <h2>Configure Cluster</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <div className={`${styles.inputContainer} ${styles.dropdownContainer}`}>
                    <label htmlFor="rg-input">Resource Group</label>
                    <ResourceSelector<ResourceGroup>
                        id="rg-input"
                        className={styles.midControl}
                        resources={lazyGroups}
                        selectedItem={props.state.content.resourceGroup || null}
                        valueGetter={(g) => g}
                        labelGetter={(g) => g}
                        onSelect={(g) =>
                            props.eventHandlers.onSetDialogContent({
                                dialog: "cluster",
                                content: { ...props.state.content, resourceGroup: g || undefined },
                            })
                        }
                    />

                    <label htmlFor="cluster-name-input" className={styles.label}>
                        Cluster Name
                    </label>
                    {hasValue(lazyClusters) && (
                        <ResourceSelector<AcrName>
                            id="cluster-name-input"
                            className={styles.midControl}
                            resources={lazyClusters.value}
                            selectedItem={props.state.content.name || null}
                            valueGetter={(n) => n}
                            labelGetter={(n) => n}
                            onSelect={(n) =>
                                props.eventHandlers.onSetDialogContent({
                                    dialog: "cluster",
                                    content: { ...props.state.content, name: n || undefined },
                                })
                            }
                        />
                    )}
                </div>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={isNothing(validate())}>
                        Save
                    </VSCodeButton>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => props.eventHandlers.onSetDialogVisibility({ dialog: "cluster", shown: false })}
                    >
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}

type LocalData = {
    lazyGroups: Lazy<ResourceGroup[]>;
    lazyClusters: Maybe<Lazy<ClusterName[]>>;
};

function prepareData(
    subscriptionData: SubscriptionReferenceData,
    resourceGroup: ResourceGroup | undefined,
    updates: EventHandlerFunc[],
): LocalData {
    const returnValue: LocalData = {
        lazyGroups: newLoading(),
        lazyClusters: resourceGroup ? just(newLoading()) : nothing(),
    };

    const resourceGroupsData = subscriptionData.resourceGroups;
    returnValue.lazyGroups = lazyMap(resourceGroupsData, (data) => data.map((g) => g.key.resourceGroup));
    if (!isLoaded(resourceGroupsData)) {
        loadResourceGroups(subscriptionData, updates);
        return returnValue;
    }

    if (resourceGroup) {
        const resourceGroupData = getOrThrow(
            resourceGroupsData.value,
            (g) => g.key.resourceGroup === resourceGroup,
            `${resourceGroup} not found`,
        );
        const clustersData = resourceGroupData.clusters;
        returnValue.lazyClusters = just(lazyMap(clustersData, (data) => data.map((g) => g.key.clusterName)));
        if (!isLoaded(clustersData)) {
            loadClusters(resourceGroupData, updates);
        }
    }

    return returnValue;
}
