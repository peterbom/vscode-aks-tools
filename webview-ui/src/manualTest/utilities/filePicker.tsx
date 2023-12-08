import { FormEvent, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import styles from "./FilePicker.module.css";
import {
    Directory,
    FileOrDirectory,
    asPathParts,
    asPathString,
    findFileSystemItem,
    isDirectory,
    matchesFilter,
} from "../draftData/testFileSystemUtils";
import {
    FileFilters,
    OpenFileOptions,
    OpenFileResult,
    SaveFileOptions,
    SaveFileResult,
} from "../../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";
import { Maybe, hasValue, isNothing, just, nothing } from "../../utilities/maybe";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export type FilePickerProps = {
    shown: boolean;
    rootDir: Directory;
    isSaving: boolean;
    options: SaveFileOptions | OpenFileOptions;
    closeRequested: (result: SaveFileResult | OpenFileResult | null) => void;
};

export function FilePicker(props: FilePickerProps) {
    const initialState = getInitialState(props);
    const [newItem, setNewItem] = useState<FileOrDirectory | null>(initialState.newItem);
    const [existingItem, setExistingItem] = useState<FileOrDirectory | null>(initialState.existingItem);

    const selectedItem = existingItem || newItem || null;
    const suggestedFilename = getSuggestedName(props);
    const selectedItemFilename = selectedItem ? selectedItem.name : "";
    const mustExist = !props.isSaving;

    // The item selected in the tree is the selected file, if it exists,
    // or the parent directory, if the file doesn't exist.
    const treeSelectedItem = existingItem || (newItem && findFileSystemItem(props.rootDir, newItem.path)) || null;

    function handleItemSelected(item: FileOrDirectory) {
        if (item.type === "directory" && props.isSaving && suggestedFilename) {
            const itemPath = [...item.path, suggestedFilename];
            const updatedExistingItem = findFileSystemItem(props.rootDir, itemPath);
            setExistingItem(updatedExistingItem);
            if (!updatedExistingItem) {
                setNewItem(createNewItem(props, item, suggestedFilename));
            }
        } else {
            setExistingItem(item);
        }
    }

    function handleFilenameChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        const filename = input.value.trim();
        if (filename) {
            const updatedNewItem = createNewItem(props, selectedItem, filename);
            setNewItem(updatedNewItem);
            const existingItem = findFileSystemItem(props.rootDir, [...updatedNewItem.path, updatedNewItem.name]);
            setExistingItem(existingItem);
        } else {
            setNewItem(null);
        }
    }

    function validate(): Maybe<SaveFileResult | OpenFileResult> {
        if (!props.isSaving) {
            if (existingItem === null) return nothing();
            if (existingItem.type !== (props.options as OpenFileOptions).type) return nothing();
            return just({ path: `/${existingItem.path.join("/")}/${existingItem.name}` });
        }

        if (selectedItem === null) return nothing();
        return just({
            path: asPathString(selectedItem),
            exists: selectedItem === existingItem,
        });
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        const result = validate();
        if (hasValue(result)) {
            props.closeRequested(result.value);
        }
    }

    return (
        <Dialog isShown={props.shown} onCancel={() => props.closeRequested(null)}>
            <h2>{props.options.title}</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />
                <FileSystemNodes
                    items={[props.rootDir]}
                    filters={props.options.filters || {}}
                    directoriesOnly={!props.isSaving && (props.options as OpenFileOptions).type === "directory"}
                    handleItemSelected={handleItemSelected}
                    selectedItem={treeSelectedItem}
                />

                <div className={styles.inputContainer}>
                    <label className={styles.label} htmlFor="filename-input">
                        File:
                    </label>
                    <VSCodeTextField
                        id="filename-input"
                        className={styles.control}
                        value={selectedItemFilename}
                        readOnly={mustExist}
                        onInput={handleFilenameChange}
                    />
                </div>

                <div className={styles.buttonContainer}>
                    <VSCodeButton type="submit" disabled={isNothing(validate())}>
                        {props.options.buttonLabel || "Select"}
                    </VSCodeButton>
                    <VSCodeButton appearance="secondary" onClick={() => props.closeRequested(null)}>
                        Cancel
                    </VSCodeButton>
                </div>
            </form>
        </Dialog>
    );
}

type InitialState = {
    newItem: FileOrDirectory | null;
    existingItem: FileOrDirectory | null;
};

function getSuggestedName(props: FilePickerProps): string | null {
    const defaultPathParts = props.options.defaultPath ? asPathParts(props.options.defaultPath) : [];
    return defaultPathParts.length > 0 ? defaultPathParts[defaultPathParts.length - 1] : null;
}

function getInitialState(props: FilePickerProps): InitialState {
    const defaultPathParts = props.options.defaultPath ? asPathParts(props.options.defaultPath) : [];
    const suggestedName = getSuggestedName(props);
    const canCreateNewItem = props.isSaving && suggestedName ? true : false;
    const newItem = canCreateNewItem ? createNewItem(props, null, suggestedName!) : null;

    const startPathParts = defaultPathParts.length > 0 ? defaultPathParts : props.rootDir.path;
    const existingItem = findFileSystemItem(props.rootDir, startPathParts);

    return { newItem, existingItem };
}

function createNewItem(
    props: FilePickerProps,
    selectedItem: FileOrDirectory | null,
    filename: string,
): FileOrDirectory {
    const defaultPathParts = props.options.defaultPath ? asPathParts(props.options.defaultPath) : [];
    let path = defaultPathParts || props.rootDir.path;
    if (selectedItem) {
        path = selectedItem.type === "directory" ? [...selectedItem.path, selectedItem.name] : selectedItem.path;
    }

    return {
        name: filename,
        type: "file",
        path,
    };
}

type FileSystemNodesProps = {
    items: FileOrDirectory[];
    filters: FileFilters;
    directoriesOnly: boolean;
    handleItemSelected: (item: FileOrDirectory) => void;
    selectedItem: FileOrDirectory | null;
};

function FileSystemNodes(props: FileSystemNodesProps) {
    return (
        <ul className={styles.nodeList}>
            {props.items.map((item) => (
                <FileSystemNode
                    key={`${item.path.join("/")}/${item.name}`}
                    item={item}
                    filters={props.filters}
                    directoriesOnly={props.directoriesOnly}
                    selectedItem={props.selectedItem}
                    handleItemSelected={props.handleItemSelected}
                />
            ))}
        </ul>
    );
}

type FileSystemNodeProps = {
    item: FileOrDirectory;
    filters: FileFilters;
    directoriesOnly: boolean;
    handleItemSelected: (item: FileOrDirectory) => void;
    selectedItem: FileOrDirectory | null;
};

function FileSystemNode(props: FileSystemNodeProps) {
    const [expanded, setExpanded] = useState(false);

    function handleToggleExpand() {
        setExpanded(isDirectory(props.item) && !expanded);
    }

    const isSelected = props.selectedItem === props.item;
    const itemClassNames = [styles.item, isSelected ? styles.selected : ""].filter((n) => !!n).join(" ");

    return (
        <>
            <li>
                {isDirectory(props.item) && (
                    <FontAwesomeIcon
                        icon={expanded ? faChevronDown : faChevronRight}
                        className={styles.expander}
                        onClick={handleToggleExpand}
                    />
                )}
                <span onClick={() => props.handleItemSelected(props.item)} className={itemClassNames}>
                    {props.item.name}
                </span>
                {expanded && isDirectory(props.item) && (
                    <FileSystemNodes
                        items={props.item.contents.filter((item) =>
                            matchesFilter(item, props.filters, props.directoriesOnly),
                        )}
                        filters={props.filters}
                        directoriesOnly={props.directoriesOnly}
                        handleItemSelected={props.handleItemSelected}
                        selectedItem={props.selectedItem}
                    />
                )}
            </li>
        </>
    );
}
