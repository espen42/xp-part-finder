import { list as listRepos } from "/lib/xp/repo";
import { runAsAdmin, startsWith } from "/lib/part-finder/utils/utils";

export function getCMSRepoIds(repoParam: string): string[] {
  if (startsWith(repoParam, "com.enonic.cms.")) {
    repoParam = repoParam.replace(/^com\.enonic\.cms\./, "");
  }

  return runAsAdmin(() =>
    listRepos()
      .map((repo) => repo.id)
      .filter((repoId) => startsWith(repoId, "com.enonic.cms."))
      .filter((repoId) => !repoParam || repoId === "com.enonic.cms." + repoParam),
  );
}
