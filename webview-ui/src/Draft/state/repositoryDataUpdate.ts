import { ImageTag } from "../../../../src/webview-contract/webviewDefinitions/draft";
import { newLoaded, newLoading } from "../../utilities/lazy";
import { RepositoryReferenceData } from "../state";

export function setBuiltTagsLoading(data: RepositoryReferenceData): RepositoryReferenceData {
    return { ...data, builtTags: newLoading() };
}

export function updateBuiltTags(data: RepositoryReferenceData, tags: ImageTag[]): RepositoryReferenceData {
    return {
        ...data,
        builtTags: newLoaded(tags),
    };
}
