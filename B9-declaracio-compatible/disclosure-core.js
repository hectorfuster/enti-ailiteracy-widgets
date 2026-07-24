function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${name} must be an array`);
  }
}

export function getGroup(groups, groupId) {
  return groups.find((group) => group.id === groupId);
}

export function getOption(groups, groupId, optionId) {
  const group = getGroup(groups, groupId);
  return group?.options.find((option) => option.id === optionId);
}

export function clauseMatchesWorld(clause, world) {
  return Object.entries(clause.where ?? {}).every(([field, allowedValues]) => {
    assertArray(allowedValues, `where.${field}`);
    return allowedValues.includes(world.profile[field]);
  });
}

export function selectedClauses(groups, selections) {
  return groups.flatMap((group) => {
    const optionId = selections[group.id];
    if (!optionId) {
      return [];
    }

    const option = getOption(groups, group.id, optionId);
    if (!option) {
      throw new Error(`Unknown option "${optionId}" for group "${group.id}"`);
    }

    return [{ group, option }];
  });
}

export function compatibleWorlds(worlds, groups, selections) {
  const clauses = selectedClauses(groups, selections);
  return worlds.filter((world) =>
    clauses.every(({ option }) => clauseMatchesWorld(option, world)),
  );
}

export function buildDeclaration(groups, selections) {
  return selectedClauses(groups, selections)
    .map(({ option }) => option.sentence.trim())
    .filter(Boolean)
    .join(" ");
}

export function compareWorldSets(previousWorlds, currentWorlds) {
  const previousIds = new Set(previousWorlds.map((world) => world.id));
  const currentIds = new Set(currentWorlds.map((world) => world.id));

  return {
    removed: previousWorlds.filter((world) => !currentIds.has(world.id)),
    reopened: currentWorlds.filter((world) => !previousIds.has(world.id)),
    retained: currentWorlds.filter((world) => previousIds.has(world.id)),
  };
}

export function evaluateDisclosure({
  worlds,
  groups,
  selections,
  targetWorldId,
  requiredGroupIds,
}) {
  const target = worlds.find((world) => world.id === targetWorldId);
  if (!target) {
    throw new Error(`Unknown target world "${targetWorldId}"`);
  }

  const clauses = selectedClauses(groups, selections);
  const compatible = compatibleWorlds(worlds, groups, selections);
  const compatibleIds = new Set(compatible.map((world) => world.id));

  const falseClauses = clauses.filter(
    ({ option }) => !clauseMatchesWorld(option, target),
  );

  const missingGroupIds = requiredGroupIds.filter((groupId) => {
    const optionId = selections[groupId];
    const option = optionId ? getOption(groups, groupId, optionId) : undefined;
    return !option?.fulfills;
  });
  const vagueGroupIds = clauses
    .filter(({ option }) => option.vague)
    .map(({ group }) => group.id);

  const truthful = compatibleIds.has(targetWorldId);
  const complete = missingGroupIds.length === 0;
  const specific = compatible.length === 1 && vagueGroupIds.length === 0;
  const selectedCount = clauses.length;

  let state = "empty";
  if (selectedCount > 0 && !truthful) {
    state = "contradiction";
  } else if (selectedCount > 0 && !complete) {
    state = "incomplete";
  } else if (selectedCount > 0 && !specific) {
    state = "ambiguous";
  } else if (selectedCount > 0) {
    state = "precise";
  }

  return {
    state,
    target,
    selectedCount,
    clauses,
    compatible,
    declaration: buildDeclaration(groups, selections),
    falseClauses,
    missingGroupIds,
    vagueGroupIds,
    truthful,
    complete,
    specific,
    success: state === "precise",
  };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return [...duplicates];
}

export function validateContent({
  worlds,
  groups,
  policy,
  scenarios,
}) {
  const errors = [];
  const worldIds = worlds.map((world) => world.id);
  const groupIds = groups.map((group) => group.id);
  const worldIdSet = new Set(worldIds);

  for (const duplicate of findDuplicates(worldIds)) {
    errors.push(`Duplicate world id: ${duplicate}`);
  }
  for (const duplicate of findDuplicates(groupIds)) {
    errors.push(`Duplicate group id: ${duplicate}`);
  }

  const globalOptionIds = [];
  for (const world of worlds) {
    if (!world.title || !world.description || !world.profile) {
      errors.push(`World ${world.id} is missing title, description, or profile`);
    }
  }

  for (const group of groups) {
    if (!group.legend || !group.help || !Array.isArray(group.options)) {
      errors.push(`Group ${group.id} is missing accessible content`);
      continue;
    }

    if (!group.options.some((option) => option.fulfills === false)) {
      errors.push(`Group ${group.id} has no explicit omission option`);
    }

    for (const duplicate of findDuplicates(
      group.options.map((option) => option.id),
    )) {
      errors.push(`Duplicate option id in ${group.id}: ${duplicate}`);
    }

    for (const option of group.options) {
      globalOptionIds.push(option.id);
      if (
        typeof option.label !== "string" ||
        typeof option.sentence !== "string" ||
        typeof option.explanation !== "string" ||
        typeof option.fulfills !== "boolean"
      ) {
        errors.push(`Option ${option.id} is missing required content`);
      }

      for (const [field, allowedValues] of Object.entries(option.where ?? {})) {
        if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
          errors.push(`Option ${option.id} has an invalid where.${field}`);
          continue;
        }

        const knownValues = new Set(
          worlds
            .map((world) => world.profile[field])
            .filter((value) => value !== undefined),
        );
        if (knownValues.size === 0) {
          errors.push(`Option ${option.id} references unknown field ${field}`);
        }
        for (const value of allowedValues) {
          if (!knownValues.has(value)) {
            errors.push(
              `Option ${option.id} references unknown ${field} value ${String(value)}`,
            );
          }
        }
      }
    }
  }

  for (const duplicate of findDuplicates(globalOptionIds)) {
    errors.push(`Option id must be globally unique: ${duplicate}`);
  }

  for (const requiredGroupId of policy.requiredGroupIds) {
    if (!groupIds.includes(requiredGroupId)) {
      errors.push(`Policy references unknown group: ${requiredGroupId}`);
    }
  }

  for (const scenario of scenarios) {
    if (!worldIdSet.has(scenario.targetWorldId)) {
      errors.push(
        `Scenario ${scenario.id} references unknown target ${scenario.targetWorldId}`,
      );
      continue;
    }

    for (const groupId of policy.requiredGroupIds) {
      const optionId = scenario.recommendedSelections?.[groupId];
      if (!optionId || !getOption(groups, groupId, optionId)) {
        errors.push(
          `Scenario ${scenario.id} has no valid recommended option for ${groupId}`,
        );
      }
    }

    try {
      const result = evaluateDisclosure({
        worlds,
        groups,
        selections: scenario.recommendedSelections ?? {},
        targetWorldId: scenario.targetWorldId,
        requiredGroupIds: policy.requiredGroupIds,
      });
      if (!result.success) {
        errors.push(
          `Scenario ${scenario.id} recommended path ends in ${result.state}`,
        );
      }
    } catch (error) {
      errors.push(`Scenario ${scenario.id} cannot be evaluated: ${error.message}`);
    }
  }

  return errors;
}
