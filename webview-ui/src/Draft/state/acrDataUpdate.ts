import { RepositoryKey, RepositoryName } from "../../../../src/webview-contract/webviewDefinitions/draft";
import { replaceItem, updateValues } from "../../utilities/array";
import { map as lazyMap, newLoaded, newLoading, newNotLoaded, orDefault } from "../../utilities/lazy";
import { AcrReferenceData, RepositoryReferenceData } from "../state";
import * as RepositoryDataUpdate from "./repositoryDataUpdate";

export function setRepositoriesLoading(data: AcrReferenceData): AcrReferenceData {
    return { ...data, repositories: newLoading() };
}

export function updateRepositoryNames(data: AcrReferenceData, repositoryNames: RepositoryName[]): AcrReferenceData {
    const existingRepos = orDefault(data.repositories, []);
    const newKeys: RepositoryKey[] = repositoryNames.map((repositoryName) => ({ ...data.key, repositoryName }));
    const updatedRepos = updateValues(
        existingRepos,
        newKeys,
        (repo) => repo.key,
        (key) => ({
            key,
            builtTags: newNotLoaded(),
        }),
    );

    return {
        ...data,
        repositories: newLoaded(updatedRepos),
    };
}

export function setBuiltTagsLoading(data: AcrReferenceData, repositoryName: RepositoryName): AcrReferenceData {
    return updateRepository(data, repositoryName, (repository) => RepositoryDataUpdate.setBuiltTagsLoading(repository));
}

export function updateBuiltTags(
    data: AcrReferenceData,
    repositoryName: RepositoryName,
    tags: string[],
): AcrReferenceData {
    return updateRepository(data, repositoryName, (repository) =>
        RepositoryDataUpdate.updateBuiltTags(repository, tags),
    );
}

function updateRepository(
    data: AcrReferenceData,
    repositoryName: RepositoryName,
    updater: (data: RepositoryReferenceData) => RepositoryReferenceData,
): AcrReferenceData {
    return {
        ...data,
        repositories: lazyMap(data.repositories, (repositories) =>
            replaceItem(repositories, (repository) => repository.key.repositoryName === repositoryName, updater),
        ),
    };
}
