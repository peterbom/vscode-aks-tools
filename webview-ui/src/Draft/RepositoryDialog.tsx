import { FormEvent, useEffect, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef, ReferenceData, vscode } from "./state";
import { isLoaded, isNotLoaded, bind as lazyBind, map as lazyMap, newLoaded } from "../utilities/lazy";
import { hasValue, map as maybeMap, orDefault as maybeOrDefault } from "../utilities/maybe";
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

    const subscriptionId = props.subscription.id;
    useEffect(() => {
        if (isNotLoaded(props.referenceData.subscriptions)) {
            return;
        }

        
        if (resourceGroup) {
            const lazyResourceGroupData = ReferenceData.getResourceGroup(props.referenceData, subscriptionId, resourceGroup);
            if (!isLoaded(lazyResourceGroupData)) {
                return;
            }

            const maybeResourceGroupData = lazyResourceGroupData.value;
            if (!hasValue(maybeResourceGroupData)) {
                return;
            }

            const resourceGroupData = maybeResourceGroupData.value;
            if (isNotLoaded(resourceGroupData.acrs)) {
                vscode.postGetAcrNamesRequest({subscriptionId, resourceGroup});
                props.eventHandlers.onSetAcrsLoading({subscriptionId, resourceGroup});
                return;
            }

            // const lazyAcrData = ReferenceData.getAcr(props.referenceData, subscriptionId, resourceGroup, acrName);
            // if (isNotLoaded(lazyAcrData)) {
            //     vscode.postGetAcrNamesRequest({subscriptionId, resourceGroup});
            //     props.eventHandlers.onSetAcrsLoading({subscriptionId, resourceGroup});
            //     return;
            // }

            // if (repositoryName) {
            //     const lazyRepositoryData = ReferenceData.getRepository(props.referenceData, subscriptionId, resourceGroup, acrName, repositoryName);
            //     if (isNotLoaded(lazyRepositoryData)) {
            //         vscode.postGetRepositoriesRequest({subscriptionId, resourceGroup, acrName});
            //         props.eventHandlers.onSetRepositoriesLoading({subscriptionId, resourceGroup, acrName});
            //     }
            // }
        }
    });

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

    const subscriptionData = ReferenceData.getSubscription(props.referenceData, props.subscription.id);
    const groups = lazyBind(subscriptionData, m => maybeOrDefault(maybeMap(m, s => s.resourceGroups), newLoaded([])));
    const groupData = ReferenceData.getResourceGroup(props.referenceData, props.subscription.id, resourceGroup);
    const acrs = lazyBind(groupData, m => maybeOrDefault(maybeMap(m, g => g.acrs), newLoaded([])));
    const acrData = ReferenceData.getAcr(props.referenceData, props.subscription.id, resourceGroup, acrName);
    const repositories = lazyBind(acrData, m => maybeOrDefault(maybeMap(m, a => a.repositories), newLoaded([])));

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
                        resources={lazyMap(groups, g => g.map(g => g.name))}
                        selectedItem={resourceGroup}
                        valueGetter={g => g}
                        labelGetter={g => g}
                        onSelect={handleResourceGroupChange}
                    />

                    <label htmlFor="acr-name-input" className={styles.label}>ACR Name</label>
                    <ResourceSelector<AcrName>
                        id="acr-name-input"
                        className={styles.midControl}
                        resources={lazyMap(acrs, a => a.map(a => a.name))}
                        selectedItem={acrName}
                        valueGetter={n => n}
                        labelGetter={n => n}
                        onSelect={handleAcrNameChange}
                    />

                    <label htmlFor="repository-name-input" className={styles.label}>Repository Name</label>
                    <ResourceSelector<RepositoryName>
                        id="repository-name-input"
                        className={styles.midControl}
                        resources={lazyMap(repositories, r => r.map(r => r.name))}
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