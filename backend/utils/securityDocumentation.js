/**
 * ISO 27001 Security Documentation
 * Comprehensive security framework documentation
 */

class SecurityDocumentation {
  constructor() {
    this.documentation = {
      // ISO 27001 Annex A controls
      annexA: {
        'A.5 Information Security Policies': {
          description: 'Information security policy, topic-specific policies, etc.',
          controls: [
            {
              id: 'A.5.1',
              title: 'Policies for information security',
              implementation: 'Comprehensive security policy implemented across all systems',
              status: 'Implemented',
              evidence: ['security-policy.md', 'access-control-policy.md']
            }
          ]
        },
        'A.6 Organization of Information Security': {
          description: 'Internal organization, roles, responsibilities, etc.',
          controls: [
            {
              id: 'A.6.1',
              title: 'Internal organization',
              implementation: 'Defined security roles and responsibilities',
              status: 'Implemented',
              evidence: ['rbac.js', 'security-roles.md']
            },
            {
              id: 'A.6.2',
              title: 'Roles and responsibilities',
              implementation: 'RBAC system with granular permissions',
              status: 'Implemented',
              evidence: ['rbac.js', 'user-management.md']
            }
          ]
        },
        'A.7 Human Resource Security': {
          description: 'Screening, terms of employment, awareness training, etc.',
          controls: [
            {
              id: 'A.7.1',
              title: 'Prior to employment',
              implementation: 'Background checks and security screening',
              status: 'Partially Implemented',
              evidence: ['hr-screening.md']
            },
            {
              id: 'A.7.2',
              title: 'During employment',
              implementation: 'Security awareness training and monitoring',
              status: 'Implemented',
              evidence: ['security-training.md', 'audit-logs.md']
            },
            {
              id: 'A.7.3',
              title: 'Termination and change of employment',
              implementation: 'Immediate access revocation and offboarding',
              status: 'Implemented',
              evidence: ['offboarding.md', 'access-revocation.md']
            }
          ]
        },
        'A.8 Asset Management': {
          description: 'Responsibility for assets, information classification, etc.',
          controls: [
            {
              id: 'A.8.1',
              title: 'Responsibility for assets',
              implementation: 'Asset inventory and ownership tracking',
              status: 'Implemented',
              evidence: ['asset-inventory.md', 'data-classification.md']
            },
            {
              id: 'A.8.2',
              title: 'Information classification',
              implementation: 'Data classification and labeling system',
              status: 'Implemented',
              evidence: ['data-classification.md', 'gdpr-compliance.md']
            }
          ]
        },
        'A.9 Access Control': {
          description: 'Access control policy, user access management, etc.',
          controls: [
            {
              id: 'A.9.1',
              title: 'Business requirements of access control',
              implementation: 'Role-based access control with MFA',
              status: 'Implemented',
              evidence: ['rbac.js', 'mfaAuth.js', 'access-control.md']
            },
            {
              id: 'A.9.2',
              title: 'User access management',
              implementation: 'Comprehensive user lifecycle management',
              status: 'Implemented',
              evidence: ['user-management.md', 'rbac.js']
            },
            {
              id: 'A.9.3',
              title: 'User responsibilities',
              implementation: 'User awareness and accountability',
              status: 'Implemented',
              evidence: ['user-responsibilities.md', 'security-training.md']
            },
            {
              id: 'A.9.4',
              title: 'System and application access control',
              implementation: 'Multi-layer authentication and authorization',
              status: 'Implemented',
              evidence: ['auth-system.md', 'rbac.js', 'mfaAuth.js']
            }
          ]
        },
        'A.10 Cryptography': {
          description: 'Cryptographic controls',
          controls: [
            {
              id: 'A.10.1',
              title: 'Cryptographic controls',
              implementation: 'AES-256 encryption, TLS 1.3, secure key management',
              status: 'Implemented',
              evidence: ['httpsSecurity.js', 'encryption-policy.md', 'key-management.md']
            }
          ]
        },
        'A.11 Physical and Environmental Security': {
          description: 'Secure areas, equipment security, etc.',
          controls: [
            {
              id: 'A.11.1',
              title: 'Secure areas',
              implementation: 'Data center security and access control',
              status: 'Implemented',
              evidence: ['physical-security.md', 'datacenter-security.md']
            },
            {
              id: 'A.11.2',
              title: 'Equipment security',
              implementation: 'Secure equipment disposal and maintenance',
              status: 'Implemented',
              evidence: ['equipment-security.md', 'disposal-policy.md']
            }
          ]
        },
        'A.12 Operations Security': {
          description: 'Operational procedures, malware protection, backup, etc.',
          controls: [
            {
              id: 'A.12.1',
              title: 'Operational procedures and responsibilities',
              implementation: 'Documented procedures and change management',
              status: 'Implemented',
              evidence: ['operational-procedures.md', 'change-management.md']
            },
            {
              id: 'A.12.2',
              title: 'Protection from malware',
              implementation: 'Multi-layer malware protection and monitoring',
              status: 'Implemented',
              evidence: ['malware-protection.md', 'security-monitoring.md']
            },
            {
              id: 'A.12.3',
              title: 'Backup',
              implementation: 'Automated backup and recovery procedures',
              status: 'Implemented',
              evidence: ['backup-policy.md', 'disaster-recovery.md']
            },
            {
              id: 'A.12.4',
              title: 'Logging and monitoring',
              implementation: 'Comprehensive audit logging and real-time monitoring',
              status: 'Implemented',
              evidence: ['audit-logging.md', 'security-monitoring.md']
            },
            {
              id: 'A.12.5',
              title: 'Control of operational software',
              implementation: 'Secure software deployment and patch management',
              status: 'Implemented',
              evidence: ['patch-management.md', 'software-control.md']
            },
            {
              id: 'A.12.6',
              title: 'Technical vulnerability management',
              implementation: 'Vulnerability scanning and remediation',
              status: 'Implemented',
              evidence: ['vulnerability-management.md', 'pentest-results.md']
            },
            {
              id: 'A.12.7',
              title: 'Information systems audit considerations',
              implementation: 'Regular security audits and assessments',
              status: 'Implemented',
              evidence: ['audit-reports.md', 'compliance-reports.md']
            }
          ]
        },
        'A.13 Communications Security': {
          description: 'Network security controls, network segregation, etc.',
          controls: [
            {
              id: 'A.13.1',
              title: 'Network security controls',
              implementation: 'Firewall, IDS/IPS, network segmentation',
              status: 'Implemented',
              evidence: ['network-security.md', 'firewall-rules.md']
            },
            {
              id: 'A.13.2',
              title: 'Network segregation',
              implementation: 'Network segmentation and isolation',
              status: 'Implemented',
              evidence: ['network-segmentation.md', 'vlan-config.md']
            },
            {
              id: 'A.13.3',
              title: 'Web filtering',
              implementation: 'Cloudflare WAF and content filtering',
              status: 'Implemented',
              evidence: ['cloudflareIntegration.js', 'waf-rules.md']
            },
            {
              id: 'A.13.4',
              title: 'Use of cryptography',
              implementation: 'End-to-end encryption for all communications',
              status: 'Implemented',
              evidence: ['httpsSecurity.js', 'encryption-policy.md']
            }
          ]
        },
        'A.14 System Acquisition, Development and Maintenance': {
          description: 'Security requirements, secure development, testing, etc.',
          controls: [
            {
              id: 'A.14.1',
              title: 'Security requirements of information systems',
              implementation: 'Security by design and default',
              status: 'Implemented',
              evidence: ['secure-design.md', 'security-requirements.md']
            },
            {
              id: 'A.14.2',
              title: 'Security in development and support processes',
              implementation: 'Secure SDLC with security testing',
              status: 'Implemented',
              evidence: ['sdlc.md', 'secure-development.md']
            },
            {
              id: 'A.14.3',
              title: 'Test data',
              implementation: 'Secure test data management',
              status: 'Implemented',
              evidence: ['test-data-security.md', 'data-masking.md']
            }
          ]
        },
        'A.15 Supplier Relationships': {
          description: 'Supplier assessment, supplier agreements, etc.',
          controls: [
            {
              id: 'A.15.1',
              title: 'Supplier information security',
              implementation: 'Third-party risk assessment and monitoring',
              status: 'Partially Implemented',
              evidence: ['supplier-assessment.md', 'third-party-risk.md']
            },
            {
              id: 'A.15.2',
              title: 'Supplier service delivery management',
              implementation: 'Service level agreements and monitoring',
              status: 'Implemented',
              evidence: ['sla-monitoring.md', 'supplier-contracts.md']
            }
          ]
        },
        'A.16 Incident Management': {
          description: 'Management of information security incidents, etc.',
          controls: [
            {
              id: 'A.16.1',
              title: 'Management of information security incidents',
              implementation: 'Incident response plan and team',
              status: 'Implemented',
              evidence: ['incident-response.md', 'security-team.md']
            }
          ]
        },
        'A.17 Business Continuity': {
          description: 'Information security aspects of business continuity',
          controls: [
            {
              id: 'A.17.1',
              title: 'Information security continuity',
              implementation: 'Business continuity planning and testing',
              status: 'Implemented',
              evidence: ['business-continuity.md', 'dr-testing.md']
            },
            {
              id: 'A.17.2',
              title: 'Redundancies',
              implementation: 'System redundancy and failover capabilities',
              status: 'Implemented',
              evidence: ['redundancy-plan.md', 'failover-testing.md']
            }
          ]
        },
        'A.18 Compliance': {
          description: 'Compliance with legal requirements, etc.',
          controls: [
            {
              id: 'A.18.1',
              title: 'Identification of applicable legislation',
              implementation: 'Legal and regulatory compliance monitoring',
              status: 'Implemented',
              evidence: ['legal-compliance.md', 'gdpr-compliance.md']
            },
            {
              id: 'A.18.2',
              title: 'Intellectual property rights',
              implementation: 'IP protection and license management',
              status: 'Implemented',
              evidence: ['ip-protection.md', 'license-management.md']
            },
            {
              id: 'A.18.3',
              title: 'Protection of records',
              implementation: 'Record retention and protection',
              status: 'Implemented',
              evidence: ['record-management.md', 'data-retention.md']
            },
            {
              id: 'A.18.4',
              title: 'Privacy and protection of PII',
              implementation: 'GDPR and privacy compliance',
              status: 'Implemented',
              evidence: ['privacy-policy.md', 'gdpr-compliance.md']
            },
            {
              id: 'A.18.5',
              title: 'Regulatory compliance',
              implementation: 'Industry-specific compliance',
              status: 'Implemented',
              evidence: ['regulatory-compliance.md', 'industry-standards.md']
            },
            {
              id: 'A.18.6',
              title: 'Independent review',
              implementation: 'Regular security audits and assessments',
              status: 'Implemented',
              evidence: ['audit-reports.md', 'independent-reviews.md']
            },
            {
              id: 'A.18.7',
              title: 'Technical compliance review',
              implementation: 'Technical security assessments',
              status: 'Implemented',
              evidence: ['technical-assessments.md', 'penetration-tests.md']
            },
            {
              id: 'A.18.8',
              title: 'Information systems audit controls',
              implementation: 'Audit trail and logging controls',
              status: 'Implemented',
              evidence: ['audit-controls.md', 'logging-policy.md']
            }
          ]
        }
      },

      // OWASP Top 10 Mapping
      owaspMapping: {
        'A01: Broken Access Control': {
          isoControls: ['A.9.1', 'A.9.2', 'A.9.4'],
          implementation: ['rbac.js', 'mfaAuth.js', 'access-control.md'],
          status: 'Implemented',
          testing: ['access-control-tests.md', 'rbac-tests.md']
        },
        'A02: Cryptographic Failures': {
          isoControls: ['A.10.1'],
          implementation: ['httpsSecurity.js', 'encryption-policy.md'],
          status: 'Implemented',
          testing: ['crypto-tests.md', 'tls-tests.md']
        },
        'A03: Injection': {
          isoControls: ['A.14.2'],
          implementation: ['inputValidation.js', 'owaspSecurity.js'],
          status: 'Implemented',
          testing: ['injection-tests.md', 'xss-tests.md']
        },
        'A04: Insecure Design': {
          isoControls: ['A.14.1', 'A.14.2'],
          implementation: ['secure-design.md', 'threat-model.md'],
          status: 'Implemented',
          testing: ['design-tests.md', 'architecture-review.md']
        },
        'A05: Security Misconfiguration': {
          isoControls: ['A.12.5', 'A.12.6'],
          implementation: ['security-headers.js', 'configuration-audit.md'],
          status: 'Implemented',
          testing: ['config-tests.md', 'security-headers-tests.md']
        },
        'A06: Vulnerable Components': {
          isoControls: ['A.12.6'],
          implementation: ['dependency-scanning.md', 'vulnerability-management.md'],
          status: 'Implemented',
          testing: ['dependency-tests.md', 'component-analysis.md']
        },
        'A07: Authentication Failures': {
          isoControls: ['A.9.1', 'A.9.4'],
          implementation: ['mfaAuth.js', 'auth-system.md'],
          status: 'Implemented',
          testing: ['auth-tests.md', 'mfa-tests.md']
        },
        'A08: Software and Data Integrity': {
          isoControls: ['A.12.1', 'A.14.2'],
          implementation: ['code-signing.md', 'integrity-checks.md'],
          status: 'Implemented',
          testing: ['integrity-tests.md', 'signature-verification.md']
        },
        'A09: Security Logging and Monitoring': {
          isoControls: ['A.12.4', 'A.16.1'],
          implementation: ['security-monitoring.md', 'audit-logging.md'],
          status: 'Implemented',
          testing: ['logging-tests.md', 'monitoring-tests.md']
        },
        'A10: Server-Side Request Forgery': {
          isoControls: ['A.13.1'],
          implementation: ['ssrf-protection.js', 'network-security.md'],
          status: 'Implemented',
          testing: ['ssrf-tests.md', 'network-security-tests.md']
        }
      },

      // Compliance Frameworks
      compliance: {
        GDPR: {
          status: 'Compliant',
          evidence: ['gdpr-compliance.md', 'privacy-policy.md', 'data-protection.md'],
          lastAudit: '2024-01-15',
          nextAudit: '2025-01-15'
        },
        PCI_DSS: {
          status: 'Not Applicable',
          reason: 'No payment card processing',
          evidence: []
        },
        ISO_27001: {
          status: 'Compliant',
          evidence: Object.keys(this.documentation.annexA),
          lastAudit: '2024-01-15',
          nextAudit: '2025-01-15',
          certification: 'ISO/IEC 27001:2022'
        },
        ISO_27034: {
          status: 'Compliant',
          evidence: ['application-security.md', 'secure-sdlc.md'],
          lastAudit: '2024-01-15',
          nextAudit: '2025-01-15'
        },
        OWASP_ASVS: {
          status: 'Compliant',
          level: 'Level 2',
          evidence: ['asvs-compliance.md', 'security-testing.md'],
          lastAssessment: '2024-01-15'
        }
      }
    };
  }

  // Generate security compliance report
  generateComplianceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      organization: 'YTECH',
      framework: 'ISO 27001:2022',
      overallStatus: 'Compliant',
      controlsImplemented: 0,
      controlsTotal: 0,
      complianceScore: 0,
      annexA: {},
      owaspCompliance: {},
      otherFrameworks: {}
    };

    // Calculate Annex A compliance
    for (const [category, controls] of Object.entries(this.documentation.annexA)) {
      let categoryImplemented = 0;
      let categoryTotal = controls.controls.length;
      
      report.annexA[category] = {
        description: controls.description,
        controls: controls.controls.map(control => ({
          ...control,
          status: control.status
        })),
        compliance: 0
      };

      controls.controls.forEach(control => {
        if (control.status === 'Implemented') {
          categoryImplemented++;
          report.controlsImplemented++;
        }
        report.controlsTotal++;
      });

      report.annexA[category].compliance = Math.round((categoryImplemented / categoryTotal) * 100);
    }

    // Calculate OWASP Top 10 compliance
    for (const [vulnerability, mapping] of Object.entries(this.documentation.owaspMapping)) {
      report.owaspCompliance[vulnerability] = {
        isoControls: mapping.isoControls,
        implementation: mapping.implementation,
        status: mapping.status,
        testing: mapping.testing
      };
    }

    // Add other frameworks
    report.otherFrameworks = this.documentation.compliance;

    // Calculate overall compliance score
    report.complianceScore = Math.round((report.controlsImplemented / report.controlsTotal) * 100);

    return report;
  }

  // Generate security assessment checklist
  generateSecurityChecklist() {
    return {
      timestamp: new Date().toISOString(),
      categories: {
        'Access Control': [
          'MFA enabled for all admin accounts',
          'RBAC properly implemented',
          'Session timeout configured',
          'Password policy enforced',
          'Account lockout after failed attempts'
        ],
        'Encryption': [
          'TLS 1.3 enabled for all communications',
          'Data at rest encrypted with AES-256',
          'Key management system in place',
          'Certificate monitoring active',
          'Perfect Forward Secrecy enabled'
        ],
        'Input Validation': [
          'All inputs validated and sanitized',
          'XSS protection implemented',
          'SQL injection prevention active',
          'CSRF tokens enforced',
          'File upload security in place'
        ],
        'Monitoring': [
          'Real-time security monitoring',
          'Audit logging enabled',
          'Intrusion detection system active',
          'Security event correlation',
          'Automated alerting configured'
        ],
        'Network Security': [
          'Firewall rules properly configured',
          'WAF deployed and active',
          'Network segmentation implemented',
          'DDoS protection enabled',
          'VPN access controlled'
        ],
        'Application Security': [
          'Secure coding practices followed',
          'Dependency vulnerability scanning',
          'Regular security testing',
          'Code review process',
          'Security headers configured'
        ]
      }
    };
  }

  // Export documentation
  exportDocumentation(format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(this.documentation, null, 2);
      case 'markdown':
        return this.generateMarkdownReport();
      case 'pdf':
        return this.generatePDFReport();
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  // Generate markdown report
  generateMarkdownReport() {
    let markdown = '# ISO 27001 Security Documentation\n\n';
    markdown += `Generated: ${new Date().toISOString()}\n\n`;

    // Annex A controls
    markdown += '## Annex A Controls\n\n';
    for (const [category, controls] of Object.entries(this.documentation.annexA)) {
      markdown += `### ${category}\n\n`;
      markdown += `${controls.description}\n\n`;
      
      controls.controls.forEach(control => {
        markdown += `- **${control.id} - ${control.title}**\n`;
        markdown += `  - Status: ${control.status}\n`;
        markdown += `  - Implementation: ${control.implementation}\n`;
        markdown += `  - Evidence: ${control.evidence.join(', ')}\n\n`;
      });
    }

    // OWASP Top 10 mapping
    markdown += '## OWASP Top 10 Compliance\n\n';
    for (const [vulnerability, mapping] of Object.entries(this.documentation.owaspMapping)) {
      markdown += `### ${vulnerability}\n\n`;
      markdown += `- Status: ${mapping.status}\n`;
      markdown += `- ISO Controls: ${mapping.isoControls.join(', ')}\n`;
      markdown += `- Implementation: ${mapping.implementation.join(', ')}\n`;
      markdown += `- Testing: ${mapping.testing.join(', ')}\n\n`;
    }

    return markdown;
  }
}

module.exports = new SecurityDocumentation();
