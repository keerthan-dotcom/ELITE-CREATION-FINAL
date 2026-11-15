
export const DISTRIBUTOR_EMAILS = [
    'mnkeeru18@gmail.com',
    'elitecreations365@gmail.com',
    'kanishkanaidu23@gmail.com',
];

export const isDistributorEmail = (email: string | undefined | null) => {
    if (!email) return false;
    return DISTRIBUTOR_EMAILS.includes(email.toLowerCase());
};
