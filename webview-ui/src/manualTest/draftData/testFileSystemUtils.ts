import {
    Directory,
    FileOrDirectory,
    FileSystemType,
    isDirectory,
} from "../../../../src/webview-contract/webviewDefinitions/shared/fileSystemTypes";

export function fromFindOutput(findOutput: string, rootDirectoryName: string): Directory {
    const { path, name } = asPathAndName(rootDirectoryName);
    const rootDirectory: Directory = {
        type: "directory",
        name,
        path,
        contents: [],
    };

    const lines = findOutput
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l !== "" && l !== "d .")
        .map(asFileOrDirectory);

    return lines.reduce<Directory>(combineFiles, rootDirectory);
}

export function asPathParts(path: string): string[] {
    return path
        .trim()
        .split("/")
        .filter((d) => d !== "" && d !== ".");
}

export function asPathAndName(fullFilePath: string): { path: string[]; name: string } {
    const pathParts = asPathParts(fullFilePath);
    const [name] = pathParts.slice(-1);
    const path = pathParts.slice(0, -1);
    return { path, name };
}

function asFileOrDirectory(line: string): FileOrDirectory {
    const parts = line.split(" ");
    const type = parts[0].trim();
    const { path, name } = asPathAndName(parts[1]);

    switch (type) {
        case "f":
            return { type: "file", name, path };
        case "d":
            return { type: "directory", name, path, contents: [] };
        default:
            throw new Error(`Unexpected file type ${type}`);
    }
}

function combineFiles(rootDir: Directory, item: FileOrDirectory): Directory {
    let parentDir = rootDir;
    const parentPath = [...rootDir.path, rootDir.name];
    for (const dir of item.path) {
        parentPath.push(dir);
        let foundDir = parentDir.contents.filter(isDirectory).find((item) => item.name === dir);
        if (!foundDir) {
            foundDir = {
                type: "directory",
                name: dir,
                path: parentPath,
                contents: [],
            };
            parentDir.contents.push(foundDir);
        }
        parentDir = foundDir;
    }

    parentDir.contents.push({ ...item, path: [...parentPath, ...item.path] });
    return rootDir;
}

export function findFileSystemItem(
    searchIn: FileOrDirectory,
    itemPath: string[],
    itemType: FileSystemType,
): FileOrDirectory | null {
    const searchInPath = [...searchIn.path, searchIn.name];
    const isItemDeeper = itemPath.length > searchInPath.length;
    if (!isItemDeeper) return null;

    const isItemInSearchPath = searchInPath.slice(0, itemPath.length).every((dir, i) => itemPath[i] === dir);
    if (!isItemInSearchPath) return null;

    if (itemPath.length === searchInPath.length) {
        return searchIn;
    }

    // Not an exact file/directory match. The item could be a descendent if this is a directory.
    if (!isDirectory(searchIn)) return null;
    for (const childItem of searchIn.contents) {
        const foundDirectory = findFileSystemItem(childItem, itemPath, itemType);
        if (foundDirectory) return foundDirectory;
    }

    return null;
}
