export type AdminOrganization = {
    id: string;
    name: string;
    owner_id: string;
    seat_limit: number;
    created_at: string;
    member_count: number;
    owner_email: string | null;
    owner_business_name: string | null;
    owner_display_name: string | null;
    plan: string;
};
