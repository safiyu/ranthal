"use client";

import { useState } from "react";
import { generate2FASecret, verifyAndEnable2FA, disable2FA } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button"; // Assuming Button exists, need to check
import { useToast } from "@/components/Toast"; // Assuming Toast exists
import { Loader2 } from "lucide-react";

export default function TwoFactorSetup({ isEnabled }: { isEnabled: boolean }) {
    const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [is2FAEnabled, setIs2FAEnabled] = useState(isEnabled);
    const { showToast } = useToast();

    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const data = await generate2FASecret();
            setSetupData(data);
        } catch (e) {
            showToast("Failed to start setup", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        if (!setupData || !code) return;
        setLoading(true);
        try {
            const res = await verifyAndEnable2FA(code, setupData.secret);
            if (res.success) {
                setIs2FAEnabled(true);
                setSetupData(null);
                setCode("");
                showToast("2FA Enabled Successfully", "success");
            } else {
                showToast("Invalid Code", "error");
            }
        } catch (e) {
            showToast("Verification failed", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm("Are you sure you want to disable 2FA?")) return;
        setLoading(true);
        try {
            await disable2FA();
            setIs2FAEnabled(false);
            showToast("2FA Disabled", "success");
        } catch (e) {
            showToast("Failed to disable 2FA", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>

            {is2FAEnabled ? (
                <div>
                    <div className="flex items-center gap-2 text-green-500 mb-4">
                        <span className="font-bold">✓ Enabled</span>
                    </div>
                    <Button variant="destructive" onClick={handleDisable} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Disable 2FA
                    </Button>
                </div>
            ) : (
                <div>
                    {!setupData ? (
                        <Button onClick={handleStartSetup} disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Enable 2FA
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc).
                            </p>
                            <div className="flex justify-center bg-white p-4 rounded-lg w-fit">
                                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Verify Code</label>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="000000"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleVerify} disabled={loading || code.length !== 6}>
                                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Verify & Enable
                                </Button>
                                <Button variant="secondary" onClick={() => setSetupData(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
