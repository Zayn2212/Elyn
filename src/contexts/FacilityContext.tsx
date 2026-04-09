import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Facility {
  id: string;
  name: string;
  nickname?: string | null;
  address?: string | null;
  is_default: boolean;
  created_at: string;
}

interface FacilityContextType {
  facilities: Facility[];
  selectedFacilityId: string | 'all';
  selectedFacility: Facility | null;
  isLoading: boolean;
  setSelectedFacilityId: (id: string | 'all') => void;
  addFacility: (facility: Omit<Facility, 'id' | 'created_at'>) => Promise<Facility | null>;
  updateFacility: (id: string, updates: Partial<Facility>) => Promise<void>;
  deleteFacility: (id: string) => Promise<void>;
  setDefaultFacility: (id: string) => Promise<void>;
  refreshFacilities: () => Promise<void>;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

const FACILITY_STORAGE_KEY = 'elyn-selected-facility';

export function FacilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const selectedFacility = selectedFacilityId === 'all' 
    ? null 
    : facilities.find(f => f.id === selectedFacilityId) || null;

  const fetchFacilities = async () => {
    if (!user) {
      setFacilities([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        nickname: item.nickname,
        address: item.address,
        is_default: item.is_default || false,
        created_at: item.created_at,
      }));

      setFacilities(typedData);

      // Restore selection from localStorage or use default
      const stored = localStorage.getItem(FACILITY_STORAGE_KEY);
      if (stored && (stored === 'all' || typedData.some(f => f.id === stored))) {
        setSelectedFacilityIdState(stored);
      } else {
        const defaultFacility = typedData.find(f => f.is_default);
        if (defaultFacility) {
          setSelectedFacilityIdState(defaultFacility.id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch facilities:', e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFacilities();
  }, [user]);

  const setSelectedFacilityId = (id: string | 'all') => {
    setSelectedFacilityIdState(id);
    localStorage.setItem(FACILITY_STORAGE_KEY, id);
  };

  const addFacility = async (facility: Omit<Facility, 'id' | 'created_at'>): Promise<Facility | null> => {
    if (!user) return null;

    try {
      // If this is the first facility or marked as default, unset other defaults
      if (facility.is_default && facilities.length > 0) {
        await supabase
          .from('facilities')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('facilities')
        .insert({
          user_id: user.id,
          name: facility.name,
          nickname: facility.nickname,
          address: facility.address,
          is_default: facility.is_default || facilities.length === 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newFacility: Facility = {
        id: data.id,
        name: data.name,
        nickname: data.nickname,
        address: data.address,
        is_default: data.is_default || false,
        created_at: data.created_at,
      };

      await fetchFacilities();
      return newFacility;
    } catch (e) {
      console.error('Failed to add facility:', e);
      return null;
    }
  };

  const updateFacility = async (id: string, updates: Partial<Facility>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('facilities')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchFacilities();
    } catch (e) {
      console.error('Failed to update facility:', e);
    }
  };

  const deleteFacility = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      if (selectedFacilityId === id) {
        setSelectedFacilityId('all');
      }
      await fetchFacilities();
    } catch (e) {
      console.error('Failed to delete facility:', e);
    }
  };

  const setDefaultFacility = async (id: string) => {
    if (!user) return;

    try {
      // Unset all defaults first
      await supabase
        .from('facilities')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set new default
      await supabase
        .from('facilities')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id);

      await fetchFacilities();
    } catch (e) {
      console.error('Failed to set default facility:', e);
    }
  };

  return (
    <FacilityContext.Provider
      value={{
        facilities,
        selectedFacilityId,
        selectedFacility,
        isLoading,
        setSelectedFacilityId,
        addFacility,
        updateFacility,
        deleteFacility,
        setDefaultFacility,
        refreshFacilities: fetchFacilities,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const context = useContext(FacilityContext);
  if (context === undefined) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
}
