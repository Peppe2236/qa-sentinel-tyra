import {
  test,
  expect,
} from '@playwright/test';

import {
  buildDiagnosis,
} from '../../reporters/analyzers/sentinel-diagnostics';


test.describe(
  'QA Sentinel Tyra - Diagnostic Intelligence',
  () => {

    test(
      'diagnoses CSP analytics correctly',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'security',

            severity:
              'low',

            title:
              'Analytics request blocked by Content Security Policy',

            evidence:
              'Blocked by connect-src CSP.',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.diagnosisConfidence
        ).toBe(
          99
        );

        expect(
          diagnosis.releaseImpact
        ).toBe(
          'non-blocking'
        );
      }
    );


    test(
      'diagnoses HTTP 500 as blocking server error',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'network',

            severity:
              'high',

            title:
              'HTTP error',

            evidence:
              'GET https://example.test/api/profile returned 500',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.releaseImpact
        ).toBe(
          'blocking'
        );

        expect(
          diagnosis.rootCause.toLowerCase()
        ).toContain(
          'server-side'
        );
      }
    );


    test(
      'diagnoses HTTP 404 separately from server errors',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'network',

            severity:
              'medium',

            title:
              'HTTP error',

            evidence:
              'GET https://example.test/missing.png returned 404',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.releaseImpact
        ).toBe(
          'warning'
        );

        expect(
          diagnosis.rootCause
        ).toContain(
          '404'
        );
      }
    );


    test(
      'diagnoses DNS failure as network issue',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'network',

            severity:
              'high',

            title:
              'Network request failed',

            evidence:
              'https://api.example.test — net::ERR_NAME_NOT_RESOLVED',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.rootCause.toLowerCase()
        ).toContain(
          'dns'
        );
      }
    );


    test(
      'diagnoses runtime TypeError correctly',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'runtime',

            severity:
              'high',

            title:
              'Browser console error detected',

            evidence:
              'TypeError: Cannot read properties of undefined',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'likely'
        );

        expect(
          diagnosis.rootCause.toLowerCase()
        ).toContain(
          'type'
        );
      }
    );


    test(
      'diagnoses accessibility missing alt',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'accessibility',

            severity:
              'medium',

            title:
              'Missing alt text',

            evidence:
              'Image element has no alt attribute.',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.rootCause.toLowerCase()
        ).toContain(
          'accessible text alternative'
        );
      }
    );


    test(
      'diagnoses redirect loop as blocking navigation issue',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'navigation',

            severity:
              'high',

            title:
              'Redirect loop detected',

            evidence:
              'net::ERR_TOO_MANY_REDIRECTS',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'confirmed'
        );

        expect(
          diagnosis.releaseImpact
        ).toBe(
          'blocking'
        );
      }
    );


    test(
      'uses fallback when no specific rule matches',
      () => {
        const diagnosis =
          buildDiagnosis({
            category:
              'unknown',

            severity:
              'low',

            title:
              'Unclassified signal',

            evidence:
              'Something unexpected happened.',
          });

        expect(
          diagnosis.diagnosisStatus
        ).toBe(
          'needs-investigation'
        );

        expect(
          diagnosis.diagnosisConfidence
        ).toBe(
          60
        );
      }
    );

    test(
  'diagnoses HTTP 401 authentication failure',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'authentication',

        severity:
          'high',

        title:
          'Authentication unauthorized',

        evidence:
          'GET https://example.test/api/profile returned 401',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'authentication'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      90
    );
  }
);


test(
  'diagnoses performance timeout',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'performance',

        severity:
          'high',

        title:
          'Performance timeout',

        evidence:
          'Operation timed out after 30000 ms',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      90
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'time window'
    );
  }
);


test(
  'diagnoses broken image asset',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'content',

        severity:
          'medium',

        title:
          'Broken asset',

        evidence:
          'https://example.test/images/profile.png returned 404',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'confirmed'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'image'
    );

    expect(
      diagnosis.releaseImpact
    ).toBe(
      'non-blocking'
    );
  }
);


test(
  'diagnoses third-party dependency timeout',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'network',

        severity:
          'medium',

        title:
          'External dependency failure',

        evidence:
          'https://third-party.example.test/api — net::ERR_TIMED_OUT',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'third-party'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      90
    );
  }
);


test(
  'diagnoses form validation failure',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'functional',

        severity:
          'medium',

        title:
          'Form validation failed',

        evidence:
          'Email validation rejected a valid input value.',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'validation'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      90
    );
  }
);


test(
  'diagnoses blocked UI interaction',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'functional',

        severity:
          'high',

        title:
          'Button interaction failed',

        evidence:
          'Target button is not clickable because another element intercepted pointer events.',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'pointer'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      90
    );
  }
);


test(
  'diagnoses horizontal responsive overflow',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'responsive',

        severity:
          'medium',

        title:
          'Horizontal overflow detected',

        evidence:
          'Horizontal overflow detected on mobile viewport.',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'confirmed'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'horizontal viewport'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      95
    );
  }
);


test(
  'diagnoses CORS security failure',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'security',

        severity:
          'high',

        title:
          'CORS security failure',

        evidence:
          'Request blocked by CORS policy: No Access-Control-Allow-Origin header.',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'likely'
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'cross-origin'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      92
    );
  }
);


test(
  'diagnoses first-party API 500 as blocking',
  () => {
    const diagnosis =
      buildDiagnosis({
        category:
          'network',

        severity:
          'critical',

        title:
          'First-party API error',

        evidence:
          'GET https://api.example.test/profile returned 500',
      });

    expect(
      diagnosis.diagnosisStatus
    ).toBe(
      'confirmed'
    );

    expect(
      diagnosis.releaseImpact
    ).toBe(
      'blocking'
    );

    expect(
      diagnosis.diagnosisConfidence
    ).toBe(
      98
    );

    expect(
      diagnosis.rootCause.toLowerCase()
    ).toContain(
      'first-party'
    );
  }
);
  }
);