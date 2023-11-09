import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, isLoaded, map as lazyMap, newLoading } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import {
    AcrName,
    RepositoryName,
    ResourceGroup,
    SavedRepositoryDefinition,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import { EventHandlerFunc, loadAcrs, loadRepositories, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";
import { Maybe, hasValue, just, nothing } from "../utilities/maybe";

export interface RepositoryDialogProps {
    isShown: boolean;
    subscriptionData: SubscriptionReferenceData;
    repositoryDefinition: SavedRepositoryDefinition | null;
    eventHandlers: EventHandlers<EventDef>;
}

export function RepositoryDialog(props: RepositoryDialogProps) {
    const [resourceGroup, setResourceGroup] = useState(props.repositoryDefinition?.resourceGroup || "");
    const [acrName, setAcrName] = useState(props.repositoryDefinition?.acrName || "");
    const [repositoryName, setRepositoryName] = useState(props.repositoryDefinition?.repositoryName || "");

    const updates: EventHandlerFunc[] = [];
    const { lazyGroups, lazyAcrs, lazyRepositories } = prepareData(
        props.subscriptionData,
        resourceGroup,
        acrName,
        updates,
    );

    useEffect(() => {
        updates.map((fn) => fn(props.eventHandlers));
    });

    function canCreate() {
        // TODO:
        return resourceGroup && acrName && repositoryName;
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate()) {
            return;
        }

        props.eventHandlers.onSetRepositoryDialogShown(false);
        props.eventHandlers.onSetRepository({
            resourceGroup,
            acrName,
            repositoryName,
        });
    }

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetRepositoryDialogShown(false)}>
            <h2>Configure Image Repository</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />

                <div className={`${styles.inputContainer} ${styles.dropdownContainer}`}>
                    <label htmlFor="rg-input">Resource Group</label>
                    <ResourceSelector<ResourceGroup>
                        id="rg-input"
                        className={styles.midControl}
                        resources={lazyGroups}
                        selectedItem={resourceGroup}
                        valueGetter={(g) => g}
                        labelGetter={(g) => g}
                        onSelect={(g) => setResourceGroup(g || "")}
                    />

                    <label htmlFor="acr-name-input" className={styles.label}>
                        ACR Name
                    </label>
                    {hasValue(lazyAcrs) && (
                        <ResourceSelector<AcrName>
                            id="acr-name-input"
                            className={styles.midControl}
                            resources={lazyAcrs.value}
                            selectedItem={acrName}
                            valueGetter={(n) => n}
                            labelGetter={(n) => n}
                            onSelect={(n) => setAcrName(n || "")}
                        />
                    )}

                    <label htmlFor="repository-name-input" className={styles.label}>
                        Repository Name
                    </label>
                    {hasValue(lazyRepositories) && (
                        <ResourceSelector<RepositoryName>
                            id="repository-name-input"
                            className={styles.midControl}
                            resources={lazyRepositories.value}
                            selectedItem={repositoryName}
                            valueGetter={(n) => n}
                            labelGetter={(n) => n}
                            onSelect={(n) => setRepositoryName(n || "")}
                        />
                    )}
                </div>

                <VSCodeDivider />

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={!canCreate()}>
                        Save
                    </VSCodeButton>
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => props.eventHandlers.onSetRepositoryDialogShown(false)}
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
    lazyAcrs: Maybe<Lazy<AcrName[]>>;
    lazyRepositories: Maybe<Lazy<RepositoryName[]>>;
};

function prepareData(
    subscriptionData: SubscriptionReferenceData,
    resourceGroup: ResourceGroup,
    acrName: AcrName,
    updates: EventHandlerFunc[],
): LocalData {
    const returnValue: LocalData = {
        lazyGroups: newLoading(),
        lazyAcrs: resourceGroup ? just(newLoading()) : nothing(),
        lazyRepositories: resourceGroup && acrName ? just(newLoading()) : nothing(),
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
        const acrsData = resourceGroupData.acrs;
        returnValue.lazyAcrs = just(lazyMap(acrsData, (data) => data.map((g) => g.key.acrName)));
        if (!isLoaded(acrsData)) {
            loadAcrs(resourceGroupData, updates);
            return returnValue;
        }

        if (acrName) {
            const acrData = getOrThrow(acrsData.value, (acr) => acr.key.acrName === acrName, `${acrName} not found`);
            const repositoriesData = acrData.repositories;
            returnValue.lazyRepositories = just(
                lazyMap(repositoriesData, (data) => data.map((g) => g.key.repositoryName)),
            );
            if (!isLoaded(repositoriesData)) {
                loadRepositories(acrData, updates);
            }
        }
    }

    return returnValue;
}
