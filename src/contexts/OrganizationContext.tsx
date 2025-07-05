'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createBrowserComponentClient } from '@/utils/supabase/client';

interface Organization {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

interface Member {
    id: string;
    org_id: string;
    name: string;
    role: string;
}

interface OrganizationContextType {
    organization: Organization | null;
    member: Member | null;
    refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType>({
    organization: null,
    member: null,
    refreshOrganization: async () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [member, setMember] = useState<Member | null>(null);
    const supabase = createBrowserComponentClient();

    const refreshOrganization = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: memberData, error: memberError } = await supabase
            .from('members')
            .select(`
                *,
                organizations (*)
            `)
            .eq('id', user.id)
            .single();

        if (!memberError && memberData) {
            setMember(memberData);
            setOrganization(memberData.organizations);
        }
    };

    useEffect(() => {
        refreshOrganization();
    }, []);

    return (
        <OrganizationContext.Provider value={{ organization, member, refreshOrganization }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export const useOrganization = () => useContext(OrganizationContext); 