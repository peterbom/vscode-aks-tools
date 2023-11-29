export type FileSystemType = "file" | "directory";

type FileOrDirectoryItem = {
    type: FileSystemType;
    name: string;
    path: string[];
};

export type Directory = FileOrDirectoryItem & {
    type: "directory";
    contents: FileOrDirectory[];
};

export type File = FileOrDirectoryItem & {
    type: "file";
};

export type FileOrDirectory = File | Directory;

export function isDirectory(fileOrDirectory: FileOrDirectory): fileOrDirectory is Directory {
    return fileOrDirectory.type === "directory";
}

export type FilePickerOptions = {
    type: FileSystemType;
    mustExist: boolean;
    startIn?: string;
    suggestedName?: string;
};

export type FilePickerResult = {
    path: string;
    type: FileSystemType;
    exists: boolean;
};
