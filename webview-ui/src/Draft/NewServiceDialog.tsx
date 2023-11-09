import { FormEvent, useState } from "react";
import { Dialog } from "../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import styles from "./Draft.module.css";
import { EventHandlers } from "../utilities/state";
import { EventDef } from "./state";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export interface NewServiceDialogProps {
    isShown: boolean
    existingNames: string[]
    eventHandlers: EventHandlers<EventDef>
}

export function NewServiceDialog(props: NewServiceDialogProps) {
    const [name, setName] = useState("");

    const existingNameExists = Object.fromEntries(props.existingNames.map(name => [name, true]));

    function canCreate() {
        const newServiceName = name.trim();
        return newServiceName.length > 0 && !existingNameExists[newServiceName];
    }

    function handleNameChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        setName(input.value);
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!canCreate()) {
            return;
        }

        props.eventHandlers.onCreateNewService(name.trim());
    }

    return (
        <Dialog isShown={props.isShown} onCancel={() => props.eventHandlers.onSetNewServiceDialogShown(false)}>
            <h2>New Service</h2>
    
            <form onSubmit={handleSubmit}>
                <VSCodeDivider/>
    
                <div className={styles.inputContainer}>
                    <label htmlFor="name-input" className={styles.label}>Name</label>
                    <VSCodeTextField id="name-input" className={styles.midControl} value={name} onInput={handleNameChange} />
                </div>
    
                <VSCodeDivider/>
    
                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={!canCreate()}>Create</VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={() => props.eventHandlers.onSetNewServiceDialogShown(false)}>Cancel</VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}