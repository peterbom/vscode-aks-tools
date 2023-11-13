import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, ReferenceData, getAcrReferenceData, getResourceGroupReferenceData, getSubscriptionReferenceData } from "./state";
import { bind as lazyBind, map as lazyMap, newNotLoaded } from "../utilities/lazy";
import { ResourceSelector } from "../components/ResourceSelector";
import { AcrName, RepositoryName, ResourceGroup, Subscription } from "../../../src/webview-contract/webviewDefinitions/draft";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export interface RepositoryDialogProps {
    isShown: boolean;
    subscription: Subscription;
    referenceData: ReferenceData;
    eventHandlers: EventHandlers<EventDef>;
}

export function RepositoryDialog(props: RepositoryDialogProps) {
    const [resourceGroup, setResourceGroup] = useState("");
    const [acrName, setAcrName] = useState("");
    const [repositoryName, setRepositoryName] = useState("");

    function canCreate() {
        // TODO:
        return resourceGroup && acrName && repositoryName;
    }

    function handleResourceGroupChange(group: ResourceGroup | null) {
        setResourceGroup(group || "");
    }

    function handleAcrNameChange(acrName: AcrName | null) {
        setAcrName(acrName || "");
    }

    function handleRepositoryNameChange(repositoryName: RepositoryName | null) {
        setRepositoryName(repositoryName || "");
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate()) {
            return;
        }

        props.eventHandlers.onSetRepository({
            resourceGroup,
            acrName,
            repositoryName
        });
    }

    const subscriptionData = getSubscriptionReferenceData(props.referenceData, props.subscription.id);
    const groups = lazyBind(subscriptionData, sub => lazyMap(sub.resourceGroups, groups => groups.map(g => g.name)));
    const groupData = resourceGroup ? lazyBind(subscriptionData, data => getResourceGroupReferenceData(data, resourceGroup)) : newNotLoaded();
    const acrNames = lazyBind(groupData, group => lazyMap(group.acrs, acrs => acrs.map(acr => acr.name)));
    const acrData = acrName ? lazyBind(groupData, data => getAcrReferenceData(data, acrName)) : newNotLoaded();
    const repositoryNames = lazyBind(acrData, acr => lazyMap(acr.repositories, repos => repos.map(repo => repo.name)));

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetRepositoryDialogShown(false)}>
            <h2>New Service</h2>
    
            <form onSubmit={handleSubmit}>
                <VSCodeDivider/>
    
                <div className={styles.inputContainer}>
                    <label htmlFor="rg-input">Resource Group</label>
                    <ResourceSelector<ResourceGroup>
                        id="rg-input"
                        className={styles.midControl}
                        resources={groups}
                        selectedItem={resourceGroup}
                        valueGetter={g => g}
                        labelGetter={g => g}
                        onSelect={handleResourceGroupChange}
                    />

                    <label htmlFor="acr-name-input" className={styles.label}>ACR Name</label>
                    <ResourceSelector<AcrName>
                        id="acr-name-input"
                        className={styles.midControl}
                        resources={acrNames}
                        selectedItem={acrName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={handleAcrNameChange}
                    />

                    <label htmlFor="repository-name-input" className={styles.label}>Repository Name</label>
                    <ResourceSelector<RepositoryName>
                        id="repository-name-input"
                        className={styles.midControl}
                        resources={repositoryNames}
                        selectedItem={repositoryName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={handleRepositoryNameChange}
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