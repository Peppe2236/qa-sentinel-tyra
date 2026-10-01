export function requiredSessionsVerified(authentication, targets) {
  return targets.length > 0 && targets.every(target => authentication.some(
    item => item.target === target && item.verified === true && item.status === 'VERIFIED'
  ));
}

function recoveryAction(auth) {
  const siteId = auth.siteId ?? auth.statePath?.split(/[\\/]/).pop()?.replace(/\.json$/, '');
  const command = siteId === 'nation-dev' ? 'node scripts/auth-refresh.mjs nation-dev'
    : siteId === 'nation' ? 'npm run auth:nation:refresh:manual'
    : siteId === 'ai-skills' ? 'npm run auth:skills:refresh:manual' : null;
  return command ? `Run ${command}, then qa:preflight and Full QA.`
    : 'Verify the configured session, then qa:preflight and Full QA.';
}

const executedStatuses = new Set(['passed', 'failed', 'timedOut', 'interrupted']);

export function assessCoverage(scope, tests, authentication = []) {
  // Retry attempts must not inflate coverage. A skipped result is no execution.
  const results = new Map();
  for (const test of tests) {
    const key = `${test.project}|${test.id ?? [test.file, test.line, test.fullTitle ?? test.title].join('|')}|${test.repeatEachIndex ?? 0}`;
    const previous = results.get(key);
    if (!previous || (test.retry ?? 0) >= (previous.retry ?? 0)) results.set(key, test);
  }
  const uniqueResults = [...results.values()];
  const configured = new Set(scope.expectedProjects ?? scope.projectDetails?.map(p => p.name) ?? []);
  const executed = uniqueResults.filter(t => executedStatuses.has(t.status) && configured.has(t.project));
  const observedProjects = [...new Set(executed.map(t => t.project).filter(Boolean))].sort();
  const projectDetails = scope.projectDetails ?? (scope.expectedProjects ?? []).map(name => ({ name, dependencies: [] }));
  const byName = new Map(projectDetails.map(p => [p.name, p]));
  function allDependencies(project, seen = new Set()) {
    for (const name of project?.dependencies ?? []) {
      if (seen.has(name)) continue;
      seen.add(name);
      allDependencies(byName.get(name), seen);
    }
    return [...seen];
  }
  const incompleteProjects = projectDetails.flatMap(project => {
    const evidence = executed.filter(t => t.project === project.name);
    const expected = project.expectedExecutions ?? null;
    if (expected !== null ? evidence.length >= expected : evidence.length > 0) return [];
    const dependencies = allDependencies(project);
    const failedDependency = dependencies.find(name => {
      const setup = uniqueResults.filter(t => t.project === name);
      return setup.some(t => ['failed', 'timedOut', 'interrupted'].includes(t.status));
    });
    const auth = authentication.find(item => {
      const siteId = item.siteId ?? item.statePath?.split(/[\\/]/).pop()?.replace(/\.json$/, '');
      return siteId && dependencies.includes(`${siteId}-auth-setup`) && !item.verified;
    });
    const skipped = uniqueResults.filter(t => t.project === project.name && t.status === 'skipped').length;
    return [{
      project: project.name, expectedExecutions: expected, actualExecutions: evidence.length,
      missingExecutions: expected === null ? null : Math.max(0, expected - evidence.length),
      skippedExecutions: skipped, dependencies,
      status: failedDependency ? 'BLOCKED' : 'NOT_EXECUTED',
      cause: failedDependency ? `Setup dependency failed: ${failedDependency}.`
        : auth ? `Possible cause: ${auth.name} was ${auth.status} during preflight.`
        : skipped ? 'Skipped results were reported; they do not verify QA coverage.'
        : 'No execution evidence. Check setup, project filters, interruption and the runner log.',
      action: auth ? recoveryAction(auth)
        : failedDependency ? `Resolve ${failedDependency}, then rerun Full QA.`
        : 'Inspect the project and runner log, then rerun Full QA.',
    }];
  });
  return {
    actualExecutions: executed.length,
    reportedExecutions: tests.length,
    skippedExecutions: uniqueResults.filter(t => t.status === 'skipped').length,
    retryAttempts: Math.max(0, tests.length - uniqueResults.length),
    observedProjects,
    missingProjects: (scope.expectedProjects ?? projectDetails.map(p => p.name)).filter(p => !observedProjects.includes(p)),
    missingExecutions: Math.max(0, (scope.expectedExecutions ?? 0) - executed.length),
    incompleteProjects,
  };
}
