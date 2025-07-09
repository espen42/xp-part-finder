import { getUser as getAuthUser, User } from "/lib/xp/auth";
import { connect } from "/lib/xp/node";

import { Node } from "@enonic-types/lib-node";

export const getAliasOrUserKey = (): `user:${string}:${string}` => {
  const user = getAuthUser();

  let partMoverAliasUser: User | null = null;
  const query = `displayName = 'Partmover (${user?.displayName})'`;

  try {
    const connection = connect({
      repoId: "system-repo",
      branch: "master",
    });
    const result = connection.query({
      start: 0,
      query,
    });
    if (result.hits.length > 0) {
      const partMoverAliasUsers: (User | null)[] = result.hits
        .map((hit) => connection.get(hit.id) as Node<User> & { principalType: string })
        .filter((item) => item?.principalType === "USER" && (item?._id || "").match(/^user:system:[a-z0-9_\-+]+/i));

      if (partMoverAliasUsers.length === 1) {
        partMoverAliasUser = partMoverAliasUsers[0];
      }
    }

    // Hack: the user-object node is missing a key field, but usually uses the same value as _id
    // @ts-expect-error TS2339
    const key = partMoverAliasUser?._id;

    if (key) {
      log.debug(`Signing batch operations with alias-user ${JSON.stringify(partMoverAliasUser?.displayName)}`);
      return key;
    }

    if (!user?.key) {
      throw Error("Couldn't resolve user.key: " + JSON.stringify(user));
    }

    log.debug(
      `No alias-user found (looked for ${JSON.stringify(query)} in system-repo/master/root/identity). Signing batch operations with current user ${JSON.stringify(user?.displayName)}`,
    );

    return user.key;
  } catch (e) {
    log.warning(
      `Error trying to find Partmover alias-user (looked for ${JSON.stringify(query)} in system-repo/master/root/identity). `,
    );
    throw e;
  }
};
