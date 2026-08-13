export type DiagnosisStatus =
  | 'confirmed'
  | 'likely'
  | 'needs-investigation';

export type ReleaseImpact =
  | 'blocking'
  | 'warning'
  | 'non-blocking'
  | 'informational';

export interface SentinelDiagnosis {
  diagnosisStatus: DiagnosisStatus;

  rootCause: string;

  diagnosisConfidence: number;

  releaseImpact: ReleaseImpact;

  verificationSteps: string[];

  expectedResolution: string;
}

export interface DiagnosisInput {
  category: string;
  severity: string;
  title: string;
  evidence?: string;
}

export function buildDiagnosis(
  data: DiagnosisInput
): SentinelDiagnosis {
  const normalizedTitle =
    data.title.toLowerCase();

    

  if (
    normalizedTitle.includes(
      'analytics request blocked by content security policy'
    )
  ) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The application is attempting to connect to an analytics endpoint that is not permitted by the active Content Security Policy connect-src directive.',

      diagnosisConfidence:
        99,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Review the configured analytics endpoint.',
        'Review the Content Security Policy connect-src directive.',
        'Correct either the analytics endpoint or the allowed CSP source.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that this finding fingerprint no longer appears.',
      ],

      expectedResolution:
        'The analytics request is no longer blocked by Content Security Policy and the finding reports zero occurrences.',
    };
  }

  if (
    normalizedTitle.includes(
      'telemetry resource blocked by content security policy'
    )
  ) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A configured third-party telemetry resource is being requested by the application but is not permitted by the active Content Security Policy.',

      diagnosisConfidence:
        99,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Confirm whether the telemetry integration is still required.',
        'If required, review the Content Security Policy for the telemetry domain.',
        'If unused, remove the telemetry integration.',
        'Re-run Deep Discovery across the affected routes.',
        'Confirm that this finding fingerprint no longer appears.',
      ],

      expectedResolution:
        'The telemetry resource is either permitted intentionally or removed, and the CSP failure no longer occurs.',
    };
  }

   if (
  normalizedTitle.includes(
    'http error'
  ) ||
  normalizedTitle.includes(
    'http response error'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isServerError =
    evidence.includes('500') ||
    evidence.includes('502') ||
    evidence.includes('503') ||
    evidence.includes('504');

  const isNotFound =
    evidence.includes('404');

  if (isServerError) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The application received a server-side HTTP failure from the requested resource or endpoint.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Identify the failing endpoint from the evidence.',
        'Inspect the server or API logs for the corresponding request.',
        'Correct the backend, dependency or infrastructure failure.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that the HTTP 5xx response no longer occurs.',
      ],

      expectedResolution:
        'The affected endpoint responds successfully and the HTTP server-error finding no longer appears.',
    };
  }

  if (isNotFound) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The application requested a resource or route that returned HTTP 404 Not Found.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the missing resource or route.',
        'Confirm whether the URL is expected to exist.',
        'Correct the link, asset path, route or deployment.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that the 404 response no longer occurs.',
      ],

      expectedResolution:
        'The requested resource resolves successfully or the invalid reference is removed.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'The application received an unexpected HTTP response that may indicate a routing, backend, authorization or resource problem.',

    diagnosisConfidence:
      80,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Inspect the HTTP status code and failing URL.',
      'Determine whether the response is expected for the current user state.',
      'Correct the route, API behaviour or resource configuration if required.',
      'Re-run Deep Discovery.',
    ],

    expectedResolution:
      'The endpoint returns the expected HTTP response during verification.',
  };
}

// ==================================================
// NETWORK DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'network request failed'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isDnsFailure =
    evidence.includes(
      'err_name_not_resolved'
    );

  const isConnectionRefused =
    evidence.includes(
      'err_connection_refused'
    );

  const isConnectionReset =
    evidence.includes(
      'err_connection_reset'
    );

  const isTimeout =
    evidence.includes(
      'timed out'
    ) ||
    evidence.includes(
      'err_timed_out'
    );

  if (isDnsFailure) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The requested hostname could not be resolved, indicating a DNS or hostname configuration problem.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing hostname from the evidence.',
        'Verify that the hostname is correct.',
        'Confirm that DNS records exist and resolve correctly.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that the DNS failure no longer occurs.',
      ],

      expectedResolution:
        'The hostname resolves successfully and the network request completes without DNS failure.',
    };
  }

  if (isConnectionRefused) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The browser reached the target host but the connection was refused, indicating that the service may be unavailable or not accepting connections on the expected endpoint.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the refusing host and endpoint.',
        'Confirm that the service is running.',
        'Verify the expected port and protocol.',
        'Review firewall, proxy and infrastructure configuration.',
        'Re-run Deep Discovery after restoring connectivity.',
      ],

      expectedResolution:
        'The target service accepts the connection and the request completes successfully.',
    };
  }

  if (isConnectionReset) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The network connection was established but reset before the request completed, which may indicate an unstable service, proxy, load balancer or upstream dependency.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected endpoint.',
        'Review service and proxy logs.',
        'Check upstream dependencies and connection stability.',
        'Repeat the request outside the browser if needed.',
        'Re-run Deep Discovery after correcting the network condition.',
      ],

      expectedResolution:
        'The connection remains stable until the request completes successfully.',
    };
  }

  if (isTimeout) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The request did not complete within the expected time window, indicating a slow or unavailable endpoint, dependency or network path.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the timing-out endpoint.',
        'Measure the endpoint response time.',
        'Review backend and dependency health.',
        'Correct the performance or availability problem.',
        'Re-run Deep Discovery and confirm the request completes within the expected time.',
      ],

      expectedResolution:
        'The request completes successfully within the expected response window.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'A network request failed before a valid HTTP response was received. The exact cause requires review of the failing endpoint and browser network evidence.',

    diagnosisConfidence:
      75,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Identify the failing request from the evidence.',
      'Determine whether the endpoint is first-party or third-party.',
      'Check DNS, connectivity, CORS, proxy and service availability.',
      'Correct the underlying network or service problem.',
      'Re-run Deep Discovery against the affected routes.',
    ],

    expectedResolution:
      'The request completes successfully or is confirmed to be intentionally unavailable.',
  };
}

// ==================================================
// RUNTIME DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'browser console error detected'
  ) ||
  normalizedTitle.includes(
    'page error detected'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isReferenceError =
    evidence.includes(
      'referenceerror'
    );

  const isTypeError =
    evidence.includes(
      'typeerror'
    );

  const isSyntaxError =
    evidence.includes(
      'syntaxerror'
    );

  const isUnhandledPromise =
    evidence.includes(
      'unhandled promise'
    ) ||
    evidence.includes(
      'unhandledrejection'
    );

  if (isReferenceError) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The frontend attempted to use a variable, function or identifier that was not available in the current runtime scope.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the missing identifier from the runtime evidence.',
        'Locate the affected frontend code.',
        'Verify imports, initialization order and conditional execution.',
        'Correct the missing or incorrectly scoped reference.',
        'Re-run Deep Discovery against the affected routes.',
      ],

      expectedResolution:
        'The affected route runs without the ReferenceError and the finding no longer appears.',
    };
  }

  if (isTypeError) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The frontend attempted an operation on a value that did not have the expected type or runtime shape.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Inspect the TypeError message and stack evidence.',
        'Identify the value that was null, undefined or otherwise unexpected.',
        'Trace the data or state that produced the invalid value.',
        'Add the correct handling or fix the originating state.',
        'Re-run the affected routes.',
      ],

      expectedResolution:
        'The frontend completes the affected flow without reproducing the TypeError.',
    };
  }

  if (isSyntaxError) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'JavaScript execution encountered invalid syntax or malformed executable content.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Inspect the syntax error and associated script.',
        'Locate the malformed JavaScript or generated code.',
        'Correct the syntax or build output.',
        'Redeploy the corrected asset.',
        'Re-run Deep Discovery and confirm that parsing succeeds.',
      ],

      expectedResolution:
        'The affected script parses and executes without a SyntaxError.',
    };
  }

  if (isUnhandledPromise) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'An asynchronous operation failed without being handled correctly by the application.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the rejected asynchronous operation.',
        'Inspect the associated API, state transition or promise chain.',
        'Add appropriate error handling or correct the underlying failure.',
        'Repeat the affected user flow.',
        'Confirm that no unhandled rejection is emitted.',
      ],

      expectedResolution:
        'The asynchronous operation either succeeds or fails through controlled application error handling.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'The browser reported a frontend runtime error. The available evidence confirms a client-side execution problem but does not yet identify a single implementation cause.',

    diagnosisConfidence:
      80,

    releaseImpact:
      data.severity === 'critical'
        ? 'blocking'
        : 'warning',

    verificationSteps: [
      'Inspect the complete browser error and stack trace.',
      'Reproduce the issue on the affected route.',
      'Identify the frontend component or script responsible.',
      'Correct the runtime failure.',
      'Re-run Deep Discovery and confirm that the error no longer appears.',
    ],

    expectedResolution:
      'The affected route executes without emitting the runtime error.',
  };
}

// ==================================================
// ASSET / CONTENT DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'broken asset'
  ) ||
  normalizedTitle.includes(
    'asset failed'
  ) ||
  normalizedTitle.includes(
    'resource not found'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isImage =
    evidence.includes('.png') ||
    evidence.includes('.jpg') ||
    evidence.includes('.jpeg') ||
    evidence.includes('.webp') ||
    evidence.includes('.svg');

  const isScript =
    evidence.includes('.js');

  const isStylesheet =
    evidence.includes('.css');

  if (isImage) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'An image resource referenced by the application could not be loaded successfully.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Identify the failing image URL from the evidence.',
        'Confirm that the image exists at the expected path.',
        'Correct the asset path, deployment or file reference.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that the image loads successfully.',
      ],

      expectedResolution:
        'The image loads successfully and the broken-asset finding no longer appears.',
    };
  }

  if (isScript) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A JavaScript resource required by the page could not be loaded successfully.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing JavaScript asset.',
        'Confirm that the script exists and is deployed correctly.',
        'Check the asset URL, cache and CDN configuration.',
        'Reload the affected route.',
        'Confirm that the script is loaded without error.',
      ],

      expectedResolution:
        'The JavaScript asset loads successfully and dependent functionality works as expected.',
    };
  }

  if (isStylesheet) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A stylesheet required by the page could not be loaded successfully.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing stylesheet URL.',
        'Confirm that the CSS asset exists and is deployed correctly.',
        'Correct the asset path, CDN or build output if required.',
        'Reload the affected route.',
        'Confirm that page styling is applied correctly.',
      ],

      expectedResolution:
        'The stylesheet loads successfully and the affected route renders with the intended styling.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'A page resource could not be loaded successfully, but the available evidence does not yet identify the exact asset type or underlying deployment problem.',

    diagnosisConfidence:
      80,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Identify the failing resource from the evidence.',
      'Confirm that the referenced URL is valid.',
      'Check deployment, CDN and asset-path configuration.',
      'Correct the missing or invalid resource.',
      'Re-run Deep Discovery.',
    ],

    expectedResolution:
      'The referenced resource loads successfully during verification.',
  };
}

// ==================================================
// AUTHENTICATION / AUTHORIZATION DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'authentication'
  ) ||
  normalizedTitle.includes(
    'authorization'
  ) ||
  normalizedTitle.includes(
    'unauthorized'
  ) ||
  normalizedTitle.includes(
    'forbidden'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isUnauthorized =
    evidence.includes('401') ||
    normalizedTitle.includes(
      'unauthorized'
    );

  const isForbidden =
    evidence.includes('403') ||
    normalizedTitle.includes(
      'forbidden'
    );

  if (isUnauthorized) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The requested resource requires authentication, but the current request did not include valid authentication credentials or the session was not accepted.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected route or endpoint.',
        'Confirm whether authentication is required for the resource.',
        'Verify session, cookie, token and credential handling.',
        'Repeat the request with a valid authenticated session.',
        'Confirm that the expected authenticated response is returned.',
      ],

      expectedResolution:
        'Authenticated users can access the intended resource and unauthorized responses only occur when expected.',
    };
  }

  if (isForbidden) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The request was authenticated or reached the protected resource, but access was denied by authorization rules or permissions.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected route or endpoint.',
        'Confirm the expected user role or permission.',
        'Review authorization rules and permission checks.',
        'Repeat the flow with the correct authorized account.',
        'Confirm that allowed users can access the resource and restricted users remain blocked.',
      ],

      expectedResolution:
        'Authorization rules match the intended access model and valid users receive the expected response.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'An authentication or authorization-related signal was detected, but the current evidence is not sufficient to determine whether the behaviour is expected or caused by a session, credential or permission problem.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Identify the affected authentication or authorization flow.',
      'Determine the expected access state for the current user.',
      'Inspect session, token, cookie and permission handling.',
      'Correct the access-control behaviour if required.',
      'Re-run the affected user flow.',
    ],

    expectedResolution:
      'Authentication and authorization behaviour matches the intended access policy without unexpected access failures.',
  };
}

// ==================================================
// ACCESSIBILITY DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'accessibility'
  ) ||
  normalizedTitle.includes(
    'missing alt'
  ) ||
  normalizedTitle.includes(
    'missing label'
  ) ||
  normalizedTitle.includes(
    'aria'
  ) ||
  normalizedTitle.includes(
    'contrast'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isMissingAlt =
    normalizedTitle.includes(
      'missing alt'
    ) ||
    evidence.includes(
      'alt attribute'
    );

  const isMissingLabel =
    normalizedTitle.includes(
      'missing label'
    ) ||
    evidence.includes(
      'form label'
    );

  const isAriaProblem =
    normalizedTitle.includes(
      'aria'
    ) ||
    evidence.includes(
      'aria-'
    );

  const isContrastProblem =
    normalizedTitle.includes(
      'contrast'
    ) ||
    evidence.includes(
      'color contrast'
    );

  if (isMissingAlt) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'An image or visual element is missing an accessible text alternative required for assistive technology.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected image or visual element.',
        'Add an appropriate alt attribute or equivalent accessible name.',
        'Confirm that decorative images use an empty alt value where appropriate.',
        'Re-run the accessibility scan.',
        'Verify that the finding no longer appears.',
      ],

      expectedResolution:
        'The affected visual element exposes an appropriate accessible text alternative.',
    };
  }

  if (isMissingLabel) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A form control does not expose a clear accessible label or name.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected form control.',
        'Associate a visible label or appropriate accessible name.',
        'Verify the control with keyboard and assistive-technology semantics.',
        'Re-run the accessibility scan.',
      ],

      expectedResolution:
        'The form control exposes a clear accessible name and the issue no longer appears.',
    };
  }

  if (isAriaProblem) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'An ARIA role, state, property or accessible-name relationship appears to be invalid, incomplete or inconsistent with the rendered element.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected element and ARIA attribute.',
        'Confirm that the ARIA role and property are valid for the element.',
        'Prefer native semantic HTML where possible.',
        'Correct the accessibility semantics.',
        'Re-run the accessibility scan.',
      ],

      expectedResolution:
        'The affected element exposes valid and consistent accessibility semantics.',
    };
  }

  if (isContrastProblem) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'Text or important visual content does not meet the expected color-contrast requirement.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected foreground and background colors.',
        'Adjust the visual design to meet the required contrast ratio.',
        'Verify the updated component in its rendered state.',
        'Re-run the accessibility scan.',
      ],

      expectedResolution:
        'The affected content meets the required contrast threshold and the finding no longer appears.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'An accessibility issue was detected, but additional inspection is required to identify the exact semantic or interaction defect.',

    diagnosisConfidence:
      80,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Inspect the affected accessibility rule and element.',
      'Reproduce the issue using keyboard or accessibility-tree inspection where appropriate.',
      'Correct the semantic, visual or interaction problem.',
      'Re-run the accessibility scan.',
    ],

    expectedResolution:
      'The affected element or flow satisfies the expected accessibility requirement.',
  };
}

// ==================================================
// PERFORMANCE DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'performance'
  ) ||
  normalizedTitle.includes(
    'slow'
  ) ||
  normalizedTitle.includes(
    'timeout'
  ) ||
  normalizedTitle.includes(
    'regression'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isTimeout =
    normalizedTitle.includes(
      'timeout'
    ) ||
    evidence.includes(
      'timed out'
    );

  const isSlowRoute =
    normalizedTitle.includes(
      'slow route'
    ) ||
    normalizedTitle.includes(
      'slow page'
    ) ||
    evidence.includes(
      'duration'
    );

  const isRegression =
    normalizedTitle.includes(
      'regression'
    ) ||
    evidence.includes(
      'regression'
    );

  const isLargeResource =
    evidence.includes(
      'large resource'
    ) ||
    evidence.includes(
      'bundle size'
    ) ||
    evidence.includes(
      'transfer size'
    );

  if (isTimeout) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The affected operation did not complete within the configured time window, indicating a slow application flow, dependency or resource.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the route, request or action that timed out.',
        'Measure the operation outside the automated test if needed.',
        'Review backend, API, rendering and dependency timing.',
        'Correct the performance bottleneck or availability problem.',
        'Re-run the affected flow and confirm that it completes within the expected time.',
      ],

      expectedResolution:
        'The affected operation completes consistently within the configured performance window.',
    };
  }

  if (isSlowRoute) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The affected route or operation is slower than the expected performance baseline and may contain rendering, network, backend or resource bottlenecks.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Measure the affected route or action repeatedly.',
        'Separate frontend rendering time from network and backend time.',
        'Inspect slow requests, scripts, images and other resources.',
        'Optimize the identified bottleneck.',
        'Re-run the performance scan and compare the new duration with the previous result.',
      ],

      expectedResolution:
        'The route or operation returns to the expected performance range without introducing functional regressions.',
    };
  }

  if (isRegression) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'Current performance is worse than the previous or expected baseline, indicating a likely performance regression.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Compare the current measurement with the previous healthy baseline.',
        'Identify the first run or change where performance degraded.',
        'Inspect recent frontend, backend, infrastructure and dependency changes.',
        'Correct or revert the regression source.',
        'Re-run the same measurement and confirm recovery toward the baseline.',
      ],

      expectedResolution:
        'Performance returns to the accepted baseline and the regression is no longer detected.',
    };
  }

  if (isLargeResource) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A large transferred or bundled resource may be increasing page-load or interaction time.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Identify the large resource from the performance evidence.',
        'Confirm whether the resource is required on the affected route.',
        'Reduce, compress, split, lazy-load or cache the resource where appropriate.',
        'Repeat the performance measurement.',
        'Confirm that transfer size and load impact have improved.',
      ],

      expectedResolution:
        'The resource has a lower performance impact while the required functionality remains intact.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A performance-related signal was detected, but the current evidence is not sufficient to isolate the bottleneck to frontend rendering, network, backend processing or resource delivery.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'non-blocking',

    verificationSteps: [
      'Inspect the performance evidence and affected route.',
      'Measure frontend, network and backend timing separately.',
      'Establish or compare against an expected baseline.',
      'Correct the identified bottleneck.',
      'Re-run the performance scan.',
    ],

    expectedResolution:
      'The affected flow performs within the accepted baseline and no significant performance finding remains.',
  };
}

// ==================================================
// NAVIGATION / BROKEN LINK DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'broken link'
  ) ||
  normalizedTitle.includes(
    'navigation failed'
  ) ||
  normalizedTitle.includes(
    'redirect loop'
  ) ||
  normalizedTitle.includes(
    'unexpected redirect'
  ) ||
  normalizedTitle.includes(
    'route not reachable'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isRedirectLoop =
    normalizedTitle.includes(
      'redirect loop'
    ) ||
    evidence.includes(
      'too many redirects'
    ) ||
    evidence.includes(
      'err_too_many_redirects'
    );

  const isUnexpectedRedirect =
    normalizedTitle.includes(
      'unexpected redirect'
    );

  const isBrokenLink =
    normalizedTitle.includes(
      'broken link'
    ) ||
    evidence.includes(
      '404'
    );

  const isNavigationFailure =
    normalizedTitle.includes(
      'navigation failed'
    ) ||
    normalizedTitle.includes(
      'route not reachable'
    );

  if (isRedirectLoop) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The navigation entered a redirect cycle and could not reach a stable destination.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Identify the source URL and redirect chain.',
        'Inspect authentication, middleware and route redirect rules.',
        'Remove or correct the circular redirect condition.',
        'Navigate to the route again.',
        'Confirm that the destination is reached without repeated redirects.',
      ],

      expectedResolution:
        'The route reaches the intended destination through a finite and valid redirect chain.',
    };
  }

  if (isUnexpectedRedirect) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The route redirected to a destination that does not match the expected navigation behaviour.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the requested route and resulting destination.',
        'Confirm the expected navigation behaviour for the current user state.',
        'Inspect route guards, authentication rules and middleware.',
        'Correct the redirect condition if it is unintended.',
        'Re-run the navigation flow.',
      ],

      expectedResolution:
        'The route reaches the expected destination for the current user and application state.',
    };
  }

  if (isBrokenLink) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A link references a route or resource that cannot be resolved successfully.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the source page and failing link.',
        'Confirm the intended destination.',
        'Correct the URL, route or resource reference.',
        'Re-run Deep Discovery against the source route.',
        'Confirm that the link reaches a valid destination.',
      ],

      expectedResolution:
        'The link resolves successfully to the intended route or resource.',
    };
  }

  if (isNavigationFailure) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The browser could not complete navigation to the requested route. The failure may originate from routing, connectivity, authentication or application startup behaviour.',

      diagnosisConfidence:
        80,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing route.',
        'Inspect the navigation and network evidence.',
        'Confirm route configuration and application availability.',
        'Correct the routing or availability problem.',
        'Re-run Deep Discovery against the route.',
      ],

      expectedResolution:
        'The route loads successfully and reaches a stable application state.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A navigation-related problem was detected, but the current evidence is not sufficient to determine whether the cause is routing, redirects, authentication or resource availability.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'warning',

    verificationSteps: [
      'Review the source route and navigation destination.',
      'Inspect redirects and route guards.',
      'Confirm that the target route exists and is reachable.',
      'Correct the navigation behaviour if required.',
      'Re-run the affected flow.',
    ],

    expectedResolution:
      'Navigation consistently reaches the intended destination without unexpected failures or loops.',
  };
}

// ==================================================
// FIRST-PARTY API / BACKEND DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'api failure'
  ) ||
  normalizedTitle.includes(
    'backend failure'
  ) ||
  normalizedTitle.includes(
    'first-party request failed'
  ) ||
  normalizedTitle.includes(
    'first-party api error'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isServerError =
    evidence.includes('500') ||
    evidence.includes('502') ||
    evidence.includes('503') ||
    evidence.includes('504');

  const isUnauthorized =
    evidence.includes('401');

  const isForbidden =
    evidence.includes('403');

  const isNotFound =
    evidence.includes('404');

  if (isServerError) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A first-party backend or API endpoint returned a server-side failure, indicating a problem in the application backend, infrastructure or an upstream dependency.',

      diagnosisConfidence:
        98,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Identify the failing first-party endpoint.',
        'Inspect backend, infrastructure and dependency logs.',
        'Reproduce the request outside the browser if needed.',
        'Correct the backend or infrastructure failure.',
        'Re-run Deep Discovery against every affected route.',
        'Confirm that the endpoint returns a successful response.',
      ],

      expectedResolution:
        'The first-party endpoint responds successfully and the backend failure finding no longer appears.',
    };
  }

  if (isUnauthorized) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A first-party API request returned HTTP 401, indicating missing, invalid or expired authentication credentials for the requested operation.',

      diagnosisConfidence:
        92,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing API request.',
        'Confirm whether the endpoint requires authentication.',
        'Inspect session, token and credential propagation.',
        'Repeat the request with a valid authenticated session.',
        'Confirm that authorized requests return the expected response.',
      ],

      expectedResolution:
        'Authenticated requests reach the endpoint successfully and HTTP 401 responses occur only when expected.',
    };
  }

  if (isForbidden) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A first-party API request returned HTTP 403, indicating that the current user or session does not have permission to perform the requested operation.',

      diagnosisConfidence:
        92,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected API request.',
        'Confirm the expected role or permission.',
        'Review backend authorization rules.',
        'Repeat the request using an appropriately authorized account.',
        'Confirm that access behaviour matches the intended permission model.',
      ],

      expectedResolution:
        'Authorized users can complete the API operation while restricted users remain correctly blocked.',
    };
  }

  if (isNotFound) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The application requested a first-party API endpoint that returned HTTP 404, indicating a missing route, incorrect endpoint path or deployment mismatch.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing API endpoint.',
        'Confirm that the endpoint exists in the deployed backend.',
        'Check frontend API configuration and route versioning.',
        'Correct the endpoint path or backend deployment.',
        'Re-run the affected application flow.',
      ],

      expectedResolution:
        'The frontend reaches the intended API endpoint and receives the expected response.',
    };
  }

  return {
    diagnosisStatus:
      'likely',

    rootCause:
      'A first-party backend request failed or returned an unexpected response. The problem is likely within the application API, infrastructure or a backend dependency.',

    diagnosisConfidence:
      85,

    releaseImpact:
      data.severity === 'critical'
        ? 'blocking'
        : 'warning',

    verificationSteps: [
      'Identify the failing first-party endpoint.',
      'Inspect the request method, response and associated backend logs.',
      'Check backend health and upstream dependencies.',
      'Correct the underlying application or infrastructure problem.',
      'Re-run the affected user flow and Deep Discovery.',
    ],

    expectedResolution:
      'The first-party request completes successfully and dependent application functionality works as expected.',
  };
}

// ==================================================
// THIRD-PARTY DEPENDENCY DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'third-party'
  ) ||
  normalizedTitle.includes(
    'external dependency'
  ) ||
  normalizedTitle.includes(
    'external service'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isTimeout =
    evidence.includes(
      'timed out'
    ) ||
    evidence.includes(
      'err_timed_out'
    );

  const isUnavailable =
    evidence.includes('502') ||
    evidence.includes('503') ||
    evidence.includes('504') ||
    evidence.includes(
      'err_connection_refused'
    );

  const isDnsFailure =
    evidence.includes(
      'err_name_not_resolved'
    );

  if (isTimeout) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A third-party dependency did not respond within the expected time window. The external service may be slow, degraded or temporarily unavailable.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected external service.',
        'Check the provider status or service health.',
        'Confirm timeout and retry behaviour in the application.',
        'Verify graceful fallback behaviour if the dependency is optional.',
        'Re-run Deep Discovery after the external service recovers.',
      ],

      expectedResolution:
        'The external dependency responds within the expected time or the application handles the degraded state gracefully.',
    };
  }

  if (isUnavailable) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A third-party dependency appears unavailable or is refusing connections, preventing the application from completing the external request.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing third-party service.',
        'Check the provider status and availability.',
        'Verify application retry, timeout and fallback behaviour.',
        'Confirm whether the dependency is critical to the affected user flow.',
        'Re-run the affected routes after service recovery.',
      ],

      expectedResolution:
        'The third-party dependency becomes reachable again or the application handles its unavailability without breaking the primary user flow.',
    };
  }

  if (isDnsFailure) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The hostname for a third-party dependency could not be resolved, indicating an external DNS, hostname or configuration issue.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the external hostname.',
        'Confirm that the configured hostname is correct.',
        'Verify DNS resolution independently.',
        'Check whether the provider changed domains or endpoints.',
        'Re-run Deep Discovery after DNS resolution is restored.',
      ],

      expectedResolution:
        'The external hostname resolves correctly and the dependency request completes successfully.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A third-party dependency produced an unexpected failure. The application may be healthy while an external provider, integration or service is degraded.',

    diagnosisConfidence:
      75,

    releaseImpact:
      'non-blocking',

    verificationSteps: [
      'Identify the external dependency from the evidence.',
      'Determine whether the dependency is required for the affected user flow.',
      'Check provider health and integration configuration.',
      'Verify fallback and error-handling behaviour.',
      'Re-run the affected flow when the dependency is available.',
    ],

    expectedResolution:
      'The external service responds successfully or the application handles the dependency failure without unacceptable user impact.',
  };
}

// ==================================================
// FORM / INPUT / VALIDATION DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'form'
  ) ||
  normalizedTitle.includes(
    'validation'
  ) ||
  normalizedTitle.includes(
    'input'
  ) ||
  normalizedTitle.includes(
    'required field'
  ) ||
  normalizedTitle.includes(
    'submit'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isRequiredField =
    normalizedTitle.includes(
      'required field'
    ) ||
    evidence.includes(
      'required'
    );

  const isValidationFailure =
    normalizedTitle.includes(
      'validation'
    ) ||
    evidence.includes(
      'validation'
    );

  const isSubmitFailure =
    normalizedTitle.includes(
      'submit'
    ) ||
    evidence.includes(
      'submit'
    );

  const isDisabledInput =
    evidence.includes(
      'disabled'
    );

  if (isRequiredField) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A required form field is missing, incorrectly configured or not exposing the expected validation behaviour.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected required field.',
        'Confirm that the field is marked and presented as required.',
        'Verify client-side and server-side validation behaviour.',
        'Correct the field configuration or validation rule.',
        'Re-run the affected form flow.',
      ],

      expectedResolution:
        'The form correctly identifies required fields and prevents invalid submission with clear feedback.',
    };
  }

  if (isValidationFailure) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The form validation behaviour does not match the expected input rules or fails to provide the expected validation result.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected field and validation rule.',
        'Test valid and invalid input values.',
        'Compare client-side and server-side validation behaviour.',
        'Correct the validation logic or error-state handling.',
        'Re-run the affected form flow.',
      ],

      expectedResolution:
        'Valid data is accepted, invalid data is rejected correctly and users receive clear validation feedback.',
    };
  }

  if (isSubmitFailure) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The form submission did not complete as expected. The cause may involve frontend event handling, validation, network requests or backend processing.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected form and submit action.',
        'Confirm that validation completes before submission.',
        'Inspect the submit event and resulting network request.',
        'Check backend response and error handling.',
        'Correct the failing submission path and re-run the form flow.',
      ],

      expectedResolution:
        'The form submits valid data successfully and presents the expected completion state.',
    };
  }

  if (isDisabledInput) {
    return {
      diagnosisStatus:
        'needs-investigation',

      rootCause:
        'An input or form control appears disabled during the tested flow. Additional context is required to determine whether the disabled state is intentional.',

      diagnosisConfidence:
        70,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Identify the disabled control.',
        'Confirm the expected state for the current user and application flow.',
        'Inspect conditions that enable or disable the control.',
        'Correct the state logic if the control should be interactive.',
        'Re-run the affected flow.',
      ],

      expectedResolution:
        'The control is enabled or disabled according to the intended application state.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A form or input-related issue was detected, but the current evidence does not identify a single validation, state or submission failure.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'non-blocking',

    verificationSteps: [
      'Identify the affected form control or form flow.',
      'Test valid, invalid and empty input states.',
      'Inspect validation and submission behaviour.',
      'Correct the identified form logic or state problem.',
      'Re-run the affected flow.',
    ],

    expectedResolution:
      'The form behaves correctly across expected input, validation and submission states.',
  };
}

// ==================================================
// UI / INTERACTION DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'button'
  ) ||
  normalizedTitle.includes(
    'click'
  ) ||
  normalizedTitle.includes(
    'interaction'
  ) ||
  normalizedTitle.includes(
    'dropdown'
  ) ||
  normalizedTitle.includes(
    'modal'
  ) ||
  normalizedTitle.includes(
    'menu'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isNotClickable =
    evidence.includes(
      'not clickable'
    ) ||
    evidence.includes(
      'intercepted'
    ) ||
    evidence.includes(
      'pointer-events'
    );

  const isDetached =
    evidence.includes(
      'detached'
    );

  const isHidden =
    evidence.includes(
      'not visible'
    ) ||
    evidence.includes(
      'hidden'
    );

  const isDisabled =
    evidence.includes(
      'disabled'
    );

  const isNoResponse =
    normalizedTitle.includes(
      'interaction failed'
    ) ||
    evidence.includes(
      'no response'
    );

  if (isNotClickable) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The target element exists but could not receive the intended pointer interaction. Another element, layout state or CSS interaction rule may be blocking it.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected interactive element.',
        'Inspect overlapping elements and pointer-event behaviour.',
        'Verify z-index, positioning and responsive layout state.',
        'Correct the blocking UI condition.',
        'Re-run the affected interaction.',
      ],

      expectedResolution:
        'The intended element can be clicked or activated consistently without another element blocking the interaction.',
    };
  }

  if (isDetached) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The target element was removed or replaced in the DOM before the interaction completed, indicating unstable rendering or state changes during the user flow.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the component that re-renders during the interaction.',
        'Inspect state changes and DOM replacement behaviour.',
        'Confirm that the interaction targets the stable rendered element.',
        'Correct unnecessary or unstable re-rendering if required.',
        'Re-run the affected flow.',
      ],

      expectedResolution:
        'The interactive element remains stable long enough for the intended action to complete successfully.',
    };
  }

  if (isHidden) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The target control is present but not visible or available to the user in the current UI state.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the hidden control and expected UI state.',
        'Inspect responsive rules, conditional rendering and visibility styles.',
        'Confirm whether the control should be visible for the current flow.',
        'Correct the visibility or state logic if required.',
        'Re-run the interaction.',
      ],

      expectedResolution:
        'The control becomes visible and usable when the application reaches the intended state.',
    };
  }

  if (isDisabled) {
    return {
      diagnosisStatus:
        'needs-investigation',

      rootCause:
        'The target control is disabled during the observed state. Additional context is required to determine whether the disabled state is intentional or caused by incorrect application logic.',

      diagnosisConfidence:
        70,

      releaseImpact:
        'non-blocking',

      verificationSteps: [
        'Identify the disabled control.',
        'Determine the expected enabled state for the current flow.',
        'Inspect the conditions controlling the disabled property.',
        'Correct the state logic if the control should be usable.',
        'Re-run the affected flow.',
      ],

      expectedResolution:
        'The control is enabled or disabled according to the intended application state.',
    };
  }

  if (isNoResponse) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The user interaction completed at the input level but did not produce the expected application response or state transition.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected interaction and expected result.',
        'Inspect event handlers and state transitions.',
        'Check whether the interaction should trigger navigation, network activity or UI changes.',
        'Correct the broken event or application-state logic.',
        'Re-run the interaction and confirm the expected response occurs.',
      ],

      expectedResolution:
        'The interaction consistently produces the intended application response.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A UI interaction problem was detected, but the current evidence is not sufficient to isolate the cause to visibility, state, event handling, layout or DOM stability.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'non-blocking',

    verificationSteps: [
      'Identify the affected interactive element.',
      'Reproduce the interaction manually and through automation.',
      'Inspect visibility, enabled state, event handlers and DOM changes.',
      'Correct the underlying UI interaction problem.',
      'Re-run the affected flow.',
    ],

    expectedResolution:
      'The interactive control responds consistently and produces the intended user-facing result.',
  };
}

// ==================================================
// RESPONSIVE / LAYOUT DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'responsive'
  ) ||
  normalizedTitle.includes(
    'layout'
  ) ||
  normalizedTitle.includes(
    'overflow'
  ) ||
  normalizedTitle.includes(
    'viewport'
  ) ||
  normalizedTitle.includes(
    'overlap'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isHorizontalOverflow =
    normalizedTitle.includes(
      'overflow'
    ) ||
    evidence.includes(
      'horizontal overflow'
    );

  const isOutsideViewport =
    normalizedTitle.includes(
      'viewport'
    ) ||
    evidence.includes(
      'outside viewport'
    );

  const isOverlap =
    normalizedTitle.includes(
      'overlap'
    ) ||
    evidence.includes(
      'overlapping'
    );

  const isMobileLayout =
    evidence.includes(
      'mobile'
    ) ||
    evidence.includes(
      'small viewport'
    );

  if (isHorizontalOverflow) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The rendered layout exceeds the available horizontal viewport width, causing content to overflow or require unintended horizontal scrolling.',

      diagnosisConfidence:
        95,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the element or container causing horizontal overflow.',
        'Inspect fixed widths, min-width rules, margins and long unbroken content.',
        'Correct the responsive sizing or wrapping behaviour.',
        'Re-run the affected viewport profiles.',
        'Confirm that no unintended horizontal scrolling remains.',
      ],

      expectedResolution:
        'The page fits within the intended viewport width without unintended horizontal overflow.',
    };
  }

  if (isOutsideViewport) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'Important content or an interactive element is rendered outside the visible viewport in the observed layout state.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the affected element and viewport size.',
        'Inspect positioning, container dimensions and responsive breakpoints.',
        'Correct the layout so the element remains reachable and visible.',
        'Re-run the affected device profile.',
      ],

      expectedResolution:
        'The affected content remains visible and reachable within the intended viewport.',
    };
  }

  if (isOverlap) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'Two or more rendered elements overlap in a way that may hide content or prevent expected interaction.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the overlapping elements.',
        'Inspect positioning, spacing, stacking context and responsive rules.',
        'Correct the layout or z-index relationship.',
        'Test the affected breakpoint again.',
        'Confirm that content and controls remain visually separated and usable.',
      ],

      expectedResolution:
        'The affected elements render without unintended overlap and remain fully usable.',
    };
  }

  if (isMobileLayout) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The layout behaves incorrectly at a small-screen breakpoint or mobile viewport.',

      diagnosisConfidence:
        85,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the failing mobile viewport or breakpoint.',
        'Inspect responsive CSS and conditional component rendering.',
        'Compare the layout against the intended mobile design.',
        'Correct the breakpoint or responsive layout logic.',
        'Re-run the mobile and neighbouring viewport profiles.',
      ],

      expectedResolution:
        'The page renders and remains usable across the intended mobile viewport range.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A responsive or layout-related signal was detected, but the current evidence does not yet isolate the problem to overflow, positioning, viewport visibility or breakpoint behaviour.',

    diagnosisConfidence:
      70,

    releaseImpact:
      'non-blocking',

    verificationSteps: [
      'Identify the affected viewport and route.',
      'Inspect layout dimensions, breakpoints and rendered element positions.',
      'Reproduce the issue across nearby viewport sizes.',
      'Correct the responsive layout problem.',
      'Re-run the affected device profiles.',
    ],

    expectedResolution:
      'The page remains visually stable and usable across the intended viewport range.',
  };
}

// ==================================================
// SECURITY DIAGNOSTICS
// ==================================================

if (
  normalizedTitle.includes(
    'security'
  ) ||
  normalizedTitle.includes(
    'mixed content'
  ) ||
  normalizedTitle.includes(
    'cors'
  ) ||
  normalizedTitle.includes(
    'insecure request'
  ) ||
  normalizedTitle.includes(
    'certificate'
  )
) {
  const evidence =
    data.evidence?.toLowerCase() ??
    '';

  const isMixedContent =
    normalizedTitle.includes(
      'mixed content'
    ) ||
    evidence.includes(
      'mixed content'
    );

  const isCorsFailure =
    normalizedTitle.includes(
      'cors'
    ) ||
    evidence.includes(
      'cross-origin'
    ) ||
    evidence.includes(
      'access-control-allow-origin'
    );

  const isInsecureRequest =
    normalizedTitle.includes(
      'insecure request'
    ) ||
    evidence.includes(
      'http://'
    );

  const isCertificateFailure =
    normalizedTitle.includes(
      'certificate'
    ) ||
    evidence.includes(
      'err_cert'
    ) ||
    evidence.includes(
      'certificate'
    );

  if (isMixedContent) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'A secure HTTPS page attempted to load a resource over an insecure HTTP connection, creating a mixed-content security violation.',

      diagnosisConfidence:
        98,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the insecure HTTP resource from the evidence.',
        'Confirm that an HTTPS version of the resource is available.',
        'Update the application reference to use HTTPS.',
        'Re-run Deep Discovery against the affected routes.',
        'Confirm that no mixed-content warning remains.',
      ],

      expectedResolution:
        'All resources used by the HTTPS page are loaded securely and the mixed-content finding no longer appears.',
    };
  }

  if (isCorsFailure) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A cross-origin request was blocked because the target server did not allow the requesting origin or did not return the expected CORS headers.',

      diagnosisConfidence:
        92,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the blocked cross-origin request.',
        'Confirm which origins should be allowed.',
        'Review Access-Control-Allow-Origin and related CORS headers.',
        'Correct the server or API CORS configuration.',
        'Re-run the affected application flow.',
      ],

      expectedResolution:
        'Authorized cross-origin requests complete successfully while unauthorized origins remain restricted.',
    };
  }

  if (isCertificateFailure) {
    return {
      diagnosisStatus:
        'confirmed',

      rootCause:
        'The browser could not establish a trusted TLS connection because of a certificate validation problem.',

      diagnosisConfidence:
        98,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Identify the hostname with the certificate failure.',
        'Inspect certificate validity, hostname coverage and trust chain.',
        'Renew or correct the certificate configuration.',
        'Verify the endpoint in a clean browser session.',
        'Re-run Deep Discovery and confirm the TLS failure is gone.',
      ],

      expectedResolution:
        'The endpoint presents a valid trusted certificate and HTTPS connections succeed without browser security errors.',
    };
  }

  if (isInsecureRequest) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The application references an insecure HTTP endpoint or resource in a context that should use encrypted HTTPS transport.',

      diagnosisConfidence:
        90,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Identify the insecure HTTP endpoint.',
        'Confirm that the endpoint supports HTTPS.',
        'Update application or configuration references to HTTPS.',
        'Re-run the affected routes.',
      ],

      expectedResolution:
        'The application uses secure HTTPS endpoints for the affected resource or request.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'A security-related browser signal was detected, but the available evidence is not yet sufficient to classify it as mixed content, CORS, TLS or another specific security configuration problem.',

    diagnosisConfidence:
      75,

    releaseImpact:
      data.severity === 'critical'
        ? 'blocking'
        : 'warning',

    verificationSteps: [
      'Inspect the complete security evidence.',
      'Identify the affected origin, resource or browser policy.',
      'Confirm whether the behaviour is expected.',
      'Correct the security configuration or application reference if required.',
      'Re-run Deep Discovery.',
    ],

    expectedResolution:
      'The browser no longer reports the unexpected security condition and the intended flow remains functional.',
  };
}

  if (
    data.severity ===
    'critical'
  ) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'A critical application failure was detected, but additional evidence may be required to isolate the exact underlying implementation defect.',

      diagnosisConfidence:
        80,

      releaseImpact:
        'blocking',

      verificationSteps: [
        'Reproduce the issue on the affected route.',
        'Inspect the associated runtime and network evidence.',
        'Correct the underlying failure.',
        'Re-run the affected route.',
        'Confirm that the original finding fingerprint is absent.',
      ],

      expectedResolution:
        'The affected flow completes without reproducing the critical failure.',
    };
  }

  if (
    data.severity ===
    'high'
  ) {
    return {
      diagnosisStatus:
        'likely',

      rootCause:
        'The collected evidence indicates a significant application or infrastructure problem, but the exact implementation cause requires verification.',

      diagnosisConfidence:
        75,

      releaseImpact:
        'warning',

      verificationSteps: [
        'Reproduce the finding.',
        'Review the associated evidence.',
        'Correct the suspected cause.',
        'Re-scan the affected routes.',
      ],

      expectedResolution:
        'The finding no longer occurs on the affected routes.',
    };
  }

  return {
    diagnosisStatus:
      'needs-investigation',

    rootCause:
      'The signal has been detected and classified, but the current evidence is not sufficient to confirm a single root cause.',

    diagnosisConfidence:
      60,

    releaseImpact:
      data.severity === 'info'
        ? 'informational'
        : 'non-blocking',

    verificationSteps: [
      'Review the evidence associated with the finding.',
      'Reproduce the condition if possible.',
      'Investigate the suspected component or configuration.',
      'Re-run Deep Discovery after making changes.',
    ],

    expectedResolution:
      'The signal no longer appears during verification or is confirmed to be expected behaviour.',
  };
}