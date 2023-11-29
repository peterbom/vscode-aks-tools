import { FormEvent, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { VSCodeButton, VSCodeDivider, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import styles from "./FilePicker.module.css";
import {
    Directory,
    FileOrDirectory,
    FilePickerOptions,
    FilePickerResult,
    isDirectory,
} from "../../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";
import { asPathParts, findFileSystemItem } from "../draftData/testFileSystemUtils";

type ChangeEvent = Event | FormEvent<HTMLElement>;

export type FilePickerProps = {
    shown: boolean;
    rootDir: Directory;
    options: FilePickerOptions;
    closeRequested: (result: FilePickerResult | null) => void;
};

export function FilePicker(props: FilePickerProps) {
    const initialState = getInitialState(props);
    const [newItem, setNewItem] = useState<FileOrDirectory | null>(initialState.newItem);
    const [existingItem, setExistingItem] = useState<FileOrDirectory | null>(initialState.existingItem);

    const selectedItem = existingItem || newItem || null;
    const exists = selectedItem !== null;
    const filename = selectedItem ? selectedItem.name : "";

    function handleItemSelected(item: FileOrDirectory) {
        setExistingItem(item);
    }

    function handleFilenameChange(e: ChangeEvent) {
        const input = e.currentTarget as HTMLInputElement;
        const filename = input.value.trim();
        if (filename) {
            const updatedNewItem = createNewItem(props, selectedItem, filename);
            setNewItem(updatedNewItem);
            const existingItem = findFileSystemItem(
                props.rootDir,
                [...updatedNewItem.path, updatedNewItem.name],
                props.options.type,
            );
            setExistingItem(existingItem);
        } else {
            setNewItem(null);
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        props.closeRequested(
            selectedItem
                ? {
                      path: `/${selectedItem.path.join("/")}/${selectedItem.name}`,
                      type: selectedItem.type,
                      exists,
                  }
                : null,
        );
    }

    return (
        <Dialog isShown={props.shown} onCancel={() => props.closeRequested(null)}>
            <h2>Pick File</h2>

            <form onSubmit={handleSubmit}>
                <VSCodeDivider />
                <FileSystemNodes
                    items={[props.rootDir]}
                    handleItemSelected={handleItemSelected}
                    selectedItem={selectedItem}
                />

                <VSCodeDivider />

                <label htmlFor="filename-input">File:</label>
                <VSCodeTextField
                    id="filename-input"
                    value={filename}
                    readOnly={props.options.mustExist}
                    onInput={handleFilenameChange}
                />

                <div>
                    <VSCodeButton type="submit">Save</VSCodeButton>
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

function getInitialState(props: FilePickerProps): InitialState {
    const fileName = props.options.suggestedName || null;
    const canCreateNewItem = !props.options.mustExist && fileName ? true : false;

    const startPath = props.options.startIn?.split("/") || props.rootDir.path;
    const newItem = canCreateNewItem ? createNewItem(props, null, fileName!) : null;

    const existingItemPath = [...startPath, props.options.startIn || null, fileName || null].filter(
        (dir) => dir !== null,
    ) as string[];

    const existingItem = findFileSystemItem(props.rootDir, existingItemPath, props.options.type);

    return { newItem, existingItem };
}

function createNewItem(
    props: FilePickerProps,
    selectedItem: FileOrDirectory | null,
    filename: string,
): FileOrDirectory {
    const path =
        selectedItem?.path || (props.options.startIn ? asPathParts(props.options.startIn) : null) || props.rootDir.path;
    return props.options.type === "directory"
        ? {
              name: filename,
              type: "directory",
              contents: [],
              path,
          }
        : {
              name: filename,
              type: "file",
              path,
          };
}

type FileSystemNodesProps = {
    items: FileOrDirectory[];
    handleItemSelected: (item: FileOrDirectory) => void;
    selectedItem: FileOrDirectory | null;
};

function FileSystemNodes(props: FileSystemNodesProps) {
    return (
        <ul className={styles.nodeList}>
            {props.items.map((item) => (
                <FileSystemNode
                    item={item}
                    key={`${item.path.join("/")}/${item.name}`}
                    selectedItem={props.selectedItem}
                    handleItemSelected={props.handleItemSelected}
                />
            ))}
        </ul>
    );
}

type FileSystemNodeProps = {
    item: FileOrDirectory;
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
                        items={props.item.contents}
                        handleItemSelected={props.handleItemSelected}
                        selectedItem={props.selectedItem}
                    />
                )}
            </li>
        </>
    );
}
