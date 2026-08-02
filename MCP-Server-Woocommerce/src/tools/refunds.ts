import { getAxios } from './axiosClient';

export interface ListRefundsArgs {
  context?:        'view' | 'edit';
  page?:           number;
  per_page?:       number;
  search?:         string;
  after?:          string;
  before?:         string;
  exclude?:        number[];
  include?:        number[];
  offset?:         number;
  order?:          'asc' | 'desc';
  orderby?:        'date' | 'modified' | 'id' | 'include' | 'title' | 'slug';
  parent?:         number[];
  parent_exclude?: number[];
  dp?:             number;
}

export async function listRefunds(args: ListRefundsArgs = {}) {
  const axios = getAxios();
  const res = await axios.get('/refunds', { params: args });
  return res.data;
}
