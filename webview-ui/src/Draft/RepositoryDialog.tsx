import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, SubscriptionReferenceData } from "./state";
import { Lazy, isLoaded, map as lazyMap, newNotLoaded } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { AcrName, RepositoryName, ResourceGroup, SavedRepositoryDefinition } from "../../../src/webview-contract/webviewDefinitions/draft";
import { loadAcrs, loadRepositories, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";

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

    let lazyGroups: Lazy<ResourceGroup[]> = newNotLoaded();
    let lazyAcrs: Lazy<AcrName[]> = newNotLoaded();
    let lazyRepositories: Lazy<RepositoryName[]> = newNotLoaded();

    (function prepareData() {
        const resourceGroupsData = props.subscriptionData.resourceGroups;
        lazyGroups = lazyMap(resourceGroupsData, data => data.map(g => g.key.resourceGroup));
        if (!isLoaded(resourceGroupsData)) {
            loadResourceGroups(props.subscriptionData, props.eventHandlers);
            return;
        }
    
        if (resourceGroup) {
            const resourceGroupData = getOrThrow(resourceGroupsData.value, g => g.key.resourceGroup === resourceGroup, `${resourceGroup} not found`);
            const acrsData = resourceGroupData.acrs;
            lazyAcrs = lazyMap(acrsData, data => data.map(g => g.key.acrName));
            if (!isLoaded(acrsData)) {
                loadAcrs(resourceGroupData, props.eventHandlers);
                return;
            }

            if (acrName) {
                const acrData = getOrThrow(acrsData.value, acr => acr.key.acrName === acrName, `${acrName} not found`);
                const repositoriesData = acrData.repositories;
                lazyRepositories = lazyMap(repositoriesData, data => data.map(g => g.key.repositoryName));
                if (!isLoaded(repositoriesData)) {
                    loadRepositories(acrData, props.eventHandlers);
                    return;
                }
            }
        }
    })();

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
            repositoryName
        });
    }

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetRepositoryDialogShown(false)}>
            <h2>Configure Image Repository</h2>
    
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

                    <label htmlFor="acr-name-input" className={styles.label}>ACR Name</label>
                    <ResourceSelector<AcrName>
                        id="acr-name-input"
                        className={styles.midControl}
                        resources={lazyAcrs}
                        selectedItem={acrName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={n => setAcrName(n || "")}
                    />

                    <label htmlFor="repository-name-input" className={styles.label}>Repository Name</label>
                    <ResourceSelector<RepositoryName>
                        id="repository-name-input"
                        className={styles.midControl}
                        resources={lazyRepositories}
                        selectedItem={repositoryName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={n => setRepositoryName(n || "")}
                    />
                </div>
    
                <VSCodeDivider/>
    
                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={!canCreate()}>Save</VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetRepositoryDialogShown(false)}>Cancel</VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}