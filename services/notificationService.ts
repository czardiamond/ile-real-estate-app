
/**
 * Mock Notification Service
 * Simulates sending transactional emails via a backend provider (e.g., SendGrid, Postmark).
 */

export const sendEmailNotification = async (
    to: string, 
    subject: string, 
    body: string
): Promise<boolean> => {
    // Log to console to demonstrate functionality
    console.group('%c 📧 [Mock Email Service]', 'color: #166534; font-weight: bold; font-size: 12px;');
    console.log(`%cTo:%c ${to}`, 'font-weight: bold', 'color: #333');
    console.log(`%cSubject:%c ${subject}`, 'font-weight: bold', 'color: #333');
    console.log(`%cBody:%c ${body}`, 'font-weight: bold', 'color: #555');
    console.groupEnd();
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return true;
};
