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
    RepositoryName,
    ResourceGroup,
    SavedRepositoryDefinition,
} from "../../../src/webview-contract/webviewDefinitions/draft";
import { EventHandlerFunc, loadAcrs, loadRepositories, loadResourceGroups } from "./dataLoading";
import { getOrThrow } from "../utilities/array";
import { Maybe, hasValue, isNothing, just, nothing } from "../utilities/maybe";
import { DialogState } from "./state/dialogs";

export interface RepositoryDialogProps {
    state: DialogState<"repository">;
    subscriptionData: SubscriptionReferenceData;
    eventHandlers: EventHandlers<EventDef>;
}

export function RepositoryDialog(props: RepositoryDialogProps) {
    const updates: EventHandlerFunc[] = [];
    const { lazyGroups, lazyAcrs, lazyRepositories } = prepareData(
        props.subscriptionData,
        props.state.content.resourceGroup,
        props.state.content.acrName,
        updates,
    );

    useEffect(() => {
        updates.map((fn) => fn(props.eventHandlers));
    });

    function validate(): Maybe<SavedRepositoryDefinition> {
        if (!props.state.content.resourceGroup) return nothing();
        if (!props.state.content.acrName) return nothing();
        if (!props.state.content.repositoryName) return nothing();

        return just({
            resourceGroup: props.state.content.resourceGroup,
            acrName: props.state.content.acrName,
            repositoryName: props.state.content.repositoryName,
        });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const repositoryDefinition = validate();
        if (isNothing(repositoryDefinition)) {
            return;
        }

        props.eventHandlers.onSetDialogVisibility({ dialog: "repository", shown: false });
        props.eventHandlers.onSetRepository(repositoryDefinition.value);
    }

    return (
        <Dialog
            isShown={props.state.shown}
            onCancel={() => props.eventHandlers.onSetDialogVisibility({ dialog: "repository", shown: false })}
        >
            <h2>Configure Image Repository</h2>

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
                                dialog: "repository",
                                content: { ...props.state.content, resourceGroup: g || undefined },
                            })
                        }
                    />

                    <label htmlFor="acr-name-input" className={styles.label}>
                        ACR Name
                    </label>
                    {hasValue(lazyAcrs) && (
                        <ResourceSelector<AcrName>
                            id="acr-name-input"
                            className={styles.midControl}
                            resources={lazyAcrs.value}
                            selectedItem={props.state.content.acrName || null}
                            valueGetter={(n) => n}
                            labelGetter={(n) => n}
                            onSelect={(n) =>
                                props.eventHandlers.onSetDialogContent({
                                    dialog: "repository",
                                    content: { ...props.state.content, acrName: n || undefined },
                                })
                            }
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
                            selectedItem={props.state.content.repositoryName || null}
                            valueGetter={(n) => n}
                            labelGetter={(n) => n}
                            onSelect={(n) =>
                                props.eventHandlers.onSetDialogContent({
                                    dialog: "repository",
                                    content: { ...props.state.content, repositoryName: n || undefined },
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
                        onClick={() =>
                            props.eventHandlers.onSetDialogVisibility({ dialog: "repository", shown: false })
                        }
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
    resourceGroup: ResourceGroup | undefined,
    acrName: AcrName | undefined,
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
