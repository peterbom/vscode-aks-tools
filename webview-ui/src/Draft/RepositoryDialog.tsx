import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef } from "./state";
import { ResourceGroupSelector } from "./ResourceGroupSelector";
import { Lazy } from "../utilities/lazy";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export interface RepositoryDialogProps {
    isShown: boolean;
    groups: Lazy<string[]>;
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

    function handleResourceGroupChange(group: string | null) {
        setResourceGroup(group || "");
    }

    function handleAcrNameChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        setAcrName(input.value);
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

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetRepositoryDialogShown(false)}>
            <h2>New Service</h2>
    
            <form onSubmit={handleSubmit}>
                <VSCodeDivider/>
    
                <div className={styles.inputContainer}>
                    <label htmlFor="rg-input">Resource Group</label>
                    <ResourceGroupSelector
                        id="rg-input"
                        className={styles.midControl}
                        groups={props.groups}
                        selectedValue={resourceGroup}
                        onSelect={handleResourceGroupChange}
                    />

                    <label htmlFor="name-input" className={styles.label}>ACR Name</label>
                    <VSCodeTextField id="name-input" className={styles.midControl} value={acrName} onInput={handleAcrNameChange} />
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