import { getUserActivityLogs } from "@/lib/actions/user-activity";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ActivityPage() {
    const session = await auth();
    if (!session?.user?.id) {
        redirect("/login");
    }

    const logs = await getUserActivityLogs();

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">My Activity</h1>

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.length === 0 ? (
                        <li className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">No activity recorded yet.</li>
                    ) : (
                        logs.map((log) => (
                            <li key={log.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatAction(log.action)}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDetails(log.details)}</p>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                                    </div>
                                </div>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}

function formatAction(action: string) {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
}

function formatDetails(details: string | null) {
    if (!details) return '';
    try {
        const parsed = JSON.parse(details);
        return Object.entries(parsed)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    } catch {
        return details;
    }
}
