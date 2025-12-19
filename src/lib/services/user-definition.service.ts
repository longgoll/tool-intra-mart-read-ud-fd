/**
 * User Definition Service
 * 
 * Handles API calls for:
 * - Fetching categories
 * - Fetching user definitions with pagination
 */

export interface Category {
  categoryId: string;
  categoryName: string;
  sortNumber: number;
  createUserCd: string;
  createDate: number;
  recordUserCd: string;
  recordDate: number;
}

export interface UserDefinition {
  definitionId: string;
  version: number;
  categoryId: string;
  categoryName: string;
  definitionName: string;
  definitionType: string;
  createUserCd: string;
  createDate: number;
  recordUserCd: string;
  recordDate: number;
}

export interface CategoriesResponse {
  error: boolean;
  data: Category[];
}

export interface DefinitionCountResponse {
  error: boolean;
  data: number;
}

export interface UserDefinitionsResponse {
  error: boolean;
  data: UserDefinition[];
}

export interface FetchDefinitionsParams {
  categoryId: string;
  count?: number;
  index?: number;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  searchAreaOpen?: boolean;
}

class UserDefinitionService {
  private proxyUrl = '/api/intramart';

  /**
   * Fetch all categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const response = await fetch(
        `${this.proxyUrl}/imdi/api/logic/user_categories?sortColumn=CATEGORY_NAME`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
      }

      const result: CategoriesResponse = await response.json();
      
      if (result.error) {
        throw new Error('API returned error');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get count of user definitions for a category
   */
  async getDefinitionsCount(categoryId: string): Promise<number> {
    try {
      const params = new URLSearchParams({
        categoryId,
        searchAreaOpen: 'false'
      });

      const response = await fetch(
        `${this.proxyUrl}/imdi/api/logic/user_definitions_count?${params}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch definitions count: ${response.status} ${response.statusText}`);
      }

      const result: DefinitionCountResponse = await response.json();
      
      if (result.error) {
        throw new Error('API returned error');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching definitions count:', error);
      throw error;
    }
  }

  /**
   * Fetch user definitions with pagination
   */
  async getUserDefinitions(params: FetchDefinitionsParams): Promise<UserDefinition[]> {
    try {
      const queryParams = new URLSearchParams({
        categoryId: params.categoryId,
        count: String(params.count || 50),
        index: String(params.index || 1),
        sortColumn: params.sortColumn || 'DEFINITION_ID',
        sortOrder: params.sortOrder || 'asc',
        searchAreaOpen: String(params.searchAreaOpen || false)
      });

      const response = await fetch(
        `${this.proxyUrl}/imdi/api/logic/user_definitions?${queryParams}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user definitions: ${response.status} ${response.statusText}`);
      }

      const result: UserDefinitionsResponse = await response.json();
      
      if (result.error) {
        throw new Error('API returned error');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching user definitions:', error);
      throw error;
    }
  }

  /**
   * Format date from timestamp
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

export const userDefinitionService = new UserDefinitionService();
