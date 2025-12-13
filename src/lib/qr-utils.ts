import QRCode from 'qrcode';

export async function generateQRCode(text: string, color: string = '#000000'): Promise<string> {
    try {
        return await QRCode.toDataURL(text, {
            color: {
                dark: color,
                light: '#00000000', // Transparent background
            },
            width: 500, // High res for good scaling
            margin: 1,
        });
    } catch (err) {
        console.error("QR Code generation failed", err);
        throw new Error("Failed to generate QR Code");
    }
}

// Helper functions to format data for different QR types

export const formatWifi = ({ ssid, password, encryption = 'WPA', hidden = false }: any) => {
    return `WIFI:S:${ssid};T:${encryption};P:${password};H:${hidden};;`;
};

export const formatVCard = ({ name, phone, email, org, title, url }: any) => {
    return `BEGIN:VCARD
VERSION:3.0
N:${name}
FN:${name}
ORG:${org}
TITLE:${title}
TEL:${phone}
EMAIL:${email}
URL:${url}
END:VCARD`;
};

export const formatSms = ({ phone, message }: any) => {
    return `SMSTO:${phone}:${message}`;
};

export const formatEmail = ({ email, subject, body }: any) => {
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const formatPhone = (number: string) => {
    return `tel:${number}`;
};

export const formatGeo = ({ lat, long }: any) => {
    return `geo:${lat},${long}`;
};
