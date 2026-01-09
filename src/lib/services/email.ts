import nodemailer from 'nodemailer';
import type { Attachment } from 'nodemailer/lib/mailer';
import { env } from '$env/dynamic/private';

// Get SMTP config from environment with defaults
const SMTP_HOST = env.SMTP_HOST || 'mail.crossmediaplay.com';
const SMTP_PORT = env.SMTP_PORT || '465';
const SMTP_EMAIL = env.SMTP_EMAIL || '';
const SMTP_PASSWORD = env.SMTP_PASSWORD || '';

export interface EmailAttachment {
	filename: string;
	content: Buffer;
	contentType?: string;
}

const DEFAULT_EMAILS = ['trafico.ar@crossmediaplay.com', 'alvaro.ilic@crossmediaplay.com'];
const ERROR_EMAILS = ['matias.ringeling@crossmediaplay.com'];

function createTransporter() {
	return nodemailer.createTransport({
		host: SMTP_HOST || 'mail.crossmediaplay.com',
		port: parseInt(SMTP_PORT || '465'),
		secure: true, // SSL
		auth: {
			user: SMTP_EMAIL,
			pass: SMTP_PASSWORD
		}
	});
}

export async function sendEmail(
	to: string[],
	subject: string,
	body: string,
	attachments: EmailAttachment[] = []
): Promise<boolean> {
	try {
		const transporter = createTransporter();

		const mailAttachments: Attachment[] = attachments.map((att) => ({
			filename: att.filename,
			content: att.content,
			contentType: att.contentType || 'application/pdf'
		}));

		const allRecipients = [...DEFAULT_EMAILS, ...to];

		const info = await transporter.sendMail({
			from: SMTP_EMAIL,
			to: allRecipients.join(', '),
			subject,
			text: body,
			attachments: mailAttachments
		});

		console.log(`Email sent: ${info.messageId}`);
		return true;
	} catch (error) {
		console.error('Error sending email:', error);
		return false;
	}
}

export async function sendErrorNotification(
	subject: string,
	body: string
): Promise<boolean> {
	try {
		const transporter = createTransporter();

		await transporter.sendMail({
			from: SMTP_EMAIL,
			to: [...DEFAULT_EMAILS, ...ERROR_EMAILS].join(', '),
			subject,
			text: body
		});

		return true;
	} catch (error) {
		console.error('Error sending error notification:', error);
		return false;
	}
}

export function getSpanishMonthName(monthNumber: number): string {
	const months = [
		'',
		'Enero',
		'Febrero',
		'Marzo',
		'Abril',
		'Mayo',
		'Junio',
		'Julio',
		'Agosto',
		'Septiembre',
		'Octubre',
		'Noviembre',
		'Diciembre'
	];
	return months[monthNumber] || '';
}

export function getCertificationEmailSubject(clientName: string): string {
	const now = new Date();
	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const monthName = getSpanishMonthName(lastMonth.getMonth() + 1);
	const year = lastMonth.getFullYear();

	return `Certificación mes ${monthName} ${year} - ${clientName}`;
}

export function getCertificationEmailBody(): string {
	const now = new Date();
	const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const monthName = getSpanishMonthName(lastMonth.getMonth() + 1);
	const year = lastMonth.getFullYear();

	return `Buenas tardes,

Adjuntamos certificaciones correspondientes al mes de ${monthName} ${year}.

Saludos cordiales.`;
}

export { DEFAULT_EMAILS, ERROR_EMAILS };
