export interface GitStandardFile {
  download_url: string;
  git_url: string;
  html_url: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  type: string;
  url: string;
  _links: any;
}

export interface FixStandardFile extends Blob {
  path?: string;
  name?: string;
}