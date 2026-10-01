// Read FullProject dependencies and planned executions without executing tests
// or enabling any production reporter.
module.exports = class ScopeReporter {
  onBegin(config, suite) {
    const counts = new Map();
    for (const test of suite.allTests()) {
      const project = test.parent.project()?.name;
      if (project) counts.set(project, (counts.get(project) ?? 0) + 1);
    }
    const projectDetails = config.projects.filter(p => counts.has(p.name)).map(p => ({
      name: p.name, dependencies: p.dependencies ?? [],
      expectedExecutions: counts.get(p.name),
    }));
    console.log('QA_SCOPE_JSON:' + JSON.stringify({ projectDetails }));
  }
};
