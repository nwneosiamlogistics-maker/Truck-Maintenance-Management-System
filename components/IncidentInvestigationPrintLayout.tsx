import React from 'react';
import { IncidentInvestigationReport } from '../types';

interface WhyNode {
    id: string;
    text: string;
    children?: WhyNode[];
}

interface IncidentInvestigationPrintLayoutProps {
    data: IncidentInvestigationReport;
}

const IncidentInvestigationPrintLayout: React.FC<IncidentInvestigationPrintLayoutProps> = ({ data }) => {

    // Helper to render Why-Why Tree recursively in a print-friendly format
    const renderWhyNode = (nodes: any[], level = 0) => {
        return (
            <ul className={`list-none ${level > 0 ? 'ml-6 border-l-2 border-slate-300 pl-4' : ''}`}>
                {nodes.map((node) => (
                    <li key={node.id} className="mb-2">
                        <div className="flex items-start">
                            <span className="mr-2 mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            <div className="p-2 bg-slate-50 rounded border border-slate-200 text-sm w-full">
                                <span className="font-semibold text-blue-900 mr-2">Why?</span>
                                {node.text || '(Empty)'}
                            </div>
                        </div>
                        {node.children && node.children.length > 0 && renderWhyNode(node.children, level + 1)}
                    </li>
                ))}
            </ul>
        );
    };

    const formatDate = (date: string | undefined) => date ? new Date(date).toLocaleDateString('th-TH') : '-';

    // Construct Incident Type String
    const getIncidentTypeString = () => {
        const types = [];
        if (data.incidentType.injuryFatality) types.push('Injury/Fatality');
        if (data.incidentType.fireExplosion) types.push('Fire/Explosion');
        if (data.incidentType.spill) types.push('Spill');
        if (data.incidentType.propertyDamage) types.push('Property Damage');
        if (data.incidentType.envImpact) types.push('Environmental Impact');
        if (data.incidentType.vehicleIncident) types.push('Vehicle Incident');
        if (data.incidentType.reputationImpact) types.push('Reputation Impact');
        if (data.incidentType.other) types.push(`Other: ${data.incidentType.otherDetails || ''}`);
        return types.join(', ') || 'Not Specified';
    };

    return (
        <div className="p-8 bg-white text-slate-800 text-sm font-sans max-w-[210mm] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b-2 border-blue-900 pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-blue-900">Incident Investigation Report</h1>
                    <p className="text-slate-500 font-bold">แบบฟอร์มรายงานการสอบสวนอุบัติเหตุ</p>
                </div>
                <div className="text-right">
                    <p><strong>Report No:</strong> {data.reportNo || 'DRAFT'}</p>
                    <p><strong>Date:</strong> {formatDate(data.incidentDate)} {data.incidentTime}</p>
                    <p><strong>Shift:</strong> {data.incidentShift}</p>
                </div>
            </div>

            {/* 1. General Info */}
            <div className="mb-6 border border-slate-200 rounded-lg p-4 bg-slate-50">
                <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">1. General Information</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p><strong>Title:</strong> {data.incidentTitle}</p>
                        <p><strong>Location:</strong> {data.location} ({data.accidentType})</p>
                    </div>
                    <div>
                        <p><strong>Incident Class:</strong> {data.reportType}</p>
                        <p><strong>Specific Types:</strong> {getIncidentTypeString()}</p>
                    </div>
                </div>
            </div>

            {/* 2. Employee & Vehicle */}
            <div className="mb-6 grid grid-cols-2 gap-6">
                <div className="border border-slate-200 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">2. Driver Information</h2>
                    <p><strong>Name:</strong> {data.driverName} (ID: {data.driverId || '-'})</p>
                    <p><strong>Experience:</strong> {data.driverExperienceYears ?? '-'} years</p>
                    <p><strong>Age:</strong> {data.driverAge ?? '-'} years</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-4">
                    <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">3. Vehicle Information</h2>
                    <p><strong>Plate No:</strong> {data.vehicleLicensePlate}</p>
                    <p><strong>Vehicle ID:</strong> {data.vehicleId || '-'}</p>
                </div>
            </div>

            {/* 4. Description */}
            <div className="mb-6 border border-slate-200 rounded-lg p-4">
                <h2 className="text-lg font-bold text-blue-800 mb-2 border-b border-slate-300 pb-1">4. Incident Description</h2>
                <p className="whitespace-pre-wrap leading-relaxed">{data.description || '-'}</p>
            </div>

            {/* Print Break */}
            <div className="page-break"></div>

            {/* 5. Site Conditions */}
            <div className="mb-6 border border-slate-200 rounded-lg p-4">
                <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">5. Site Conditions</h2>
                <div className="grid grid-cols-3 gap-4 text-xs">
                    <p><strong>Road:</strong> {data.siteConditions?.roadSurface || '-'}</p>
                    <p><strong>Light:</strong> {data.siteConditions?.lighting || '-'}</p>
                    <p><strong>Visibility:</strong> {data.siteConditions?.visibility || '-'}</p>
                    <p><strong>Location Type:</strong> {data.siteConditions?.locationType || '-'}</p>
                </div>
            </div>

            {/* 6. SCAT Analysis */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">6. SCAT Analysis</h2>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-center">
                            <th className="border border-slate-300 p-2 w-1/5">Lack of Control</th>
                            <th className="border border-slate-300 p-2 w-1/5">Basic Causes</th>
                            <th className="border border-slate-300 p-2 w-1/5">Immediate Causes</th>
                            <th className="border border-slate-300 p-2 w-1/5">Incident</th>
                            <th className="border border-slate-300 p-2 w-1/5">Accident</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap h-24">{data.scatAnalysis?.lackOfControl}</td>
                            <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap">{data.scatAnalysis?.basicCauses}</td>
                            <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap">{data.scatAnalysis?.immediateCauses}</td>
                            <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap">{data.scatAnalysis?.incident}</td>
                            <td className="border border-slate-300 p-2 align-top whitespace-pre-wrap">{data.scatAnalysis?.accident}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 7. Why-Why Analysis */}
            <div className="mb-6 border border-slate-200 rounded-lg p-4">
                <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">7. Why-Why Analysis</h2>
                <p className="mb-2"><strong>Problem Statement:</strong> {data.whyWhyAnalysis?.problem}</p>
                <div className="mt-4">
                    {data.whyWhyAnalysis?.roots && data.whyWhyAnalysis.roots.length > 0
                        ? renderWhyNode(data.whyWhyAnalysis.roots)
                        : <p className="text-slate-400 italic">No analysis recorded.</p>
                    }
                </div>
            </div>

            {/* 8. Preventive Actions */}
            <div className="mb-6 border border-slate-200 rounded-lg p-4">
                <h2 className="text-lg font-bold text-blue-800 mb-3 border-b border-slate-300 pb-1">8. Preventive Actions</h2>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-slate-100 text-left">
                            <th className="p-2 border">Action</th>
                            <th className="p-2 border w-36">Responsible</th>
                            <th className="p-2 border w-24">Due Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.preventiveActions || []).map((action, idx) => (
                            <tr key={idx}>
                                <td className="p-2 border">{action.action}</td>
                                <td className="p-2 border">{action.responsiblePerson}</td>
                                <td className="p-2 border">{formatDate(action.dueDate)}</td>
                            </tr>
                        ))}
                        {(data.preventiveActions || []).length === 0 && (
                            <tr><td colSpan={3} className="p-2 border text-center text-slate-400">No actions recorded</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Signatures */}
            <div className="mt-12 grid grid-cols-2 gap-12">
                <div className="text-center">
                    <div className="border-b border-black mb-2 h-8"></div>
                    <p className="text-sm"><strong>Investigator:</strong> {data.managementReview?.reviewerName || '....................'}</p>
                </div>
                <div className="text-center">
                    <div className="border-b border-black mb-2 h-8"></div>
                    <p className="text-sm"><strong>Manager Acknowledge:</strong> {data.topManagementAcknowledge?.name || '....................'}</p>
                </div>
            </div>
        </div>
    );
};

export default IncidentInvestigationPrintLayout;
