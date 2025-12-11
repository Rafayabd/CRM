// Dummy Email Service - Server ko crash hone se bachane ke liye
const sendAssignmentEmail = async (toEmail, leadName, assignedBy) => {
    console.log("---------------------------------------------------");
    console.log(`[MOCK EMAIL] To: ${toEmail}`);
    console.log(`[MOCK EMAIL] Subject: New Lead Assigned: ${leadName}`);
    console.log(`[MOCK EMAIL] Message: Assigned by ${assignedBy}`);
    console.log("---------------------------------------------------");
    
    // Asli email nahi bhej raha, bas promise return kar raha hai
    return Promise.resolve(); 
};

module.exports = {
    sendAssignmentEmail
};