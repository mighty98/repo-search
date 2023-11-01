import * as React from 'react';
import { Grid, IconButton, Link, Tooltip, Typography } from '@mui/material';
import SearchBar from '../reusable/SearchBar';
import InfoIcon from '@mui/icons-material/Info';
import {
  subject as repoListSubject,
  initialState as repoListInitialState,
  setSearchCriteria,
  searchAndGet,
  setTableDataLimit,
  setTableDataOffsetPage,
  setSelectedRepo,
  getRepoDetails,
  setShowDetailsDialog,
} from '../../services/RepoList';
import Table from '../reusable/Table';
import Dialog from '../reusable/Dialog';

const RepoList = () => {
  const [repoListStore, setRepoListStore] = React.useState(repoListInitialState);

  React.useEffect(() => {
    /* Subscribe to the RXJS subject */
    let repoListSubscription = repoListSubject.subscribe(setRepoListStore);
    return () => {
      repoListSubscription.unsubscribe();
    };
  }, []);

  /* Search Bar Props - On Search */
  const onSearch = (searchInput) => {
    setSearchCriteria(searchInput);
    setTableDataOffsetPage(1);
    searchAndGet(searchInput, repoListStore.tableData.limit, 1, true);
  };

  /* Table Props - Columns, Rows, Page Options, On Page Change, On Page Size Change,  */
  const columns = [
    {
      field: 'name',
      headerName: 'Name',
      width: 300,
      sortable: false,
    },
    {
      field: 'owner_login',
      headerName: 'Owner',
      width: 200,
      sortable: false,
    },
    {
      field: 'stargazers_count',
      headerName: 'Stars',
      width: 200,
      sortable: false,
    },
    {
      field: 'link',
      headerName: 'Link',
      width: 300,
      sortable: false,
    },
    {
      field: 'details',
      headerName: 'Details',
      width: 150,
      sortable: false,
    },
  ];
  const tableDataCurrPage = repoListStore.tableData.data[repoListStore.tableData.offsetPage] || [];
  const rows = [...tableDataCurrPage];
  rows.map((row) => {
    row['owner_login'] = row['owner']['login'] || '';
    row['link'] = (
      <Link href={row['html_url']} target={'_blank'}>
        {row['full_name']}
      </Link>
    );
    row['details'] = (
      <Tooltip title={'Get Details'}>
        <IconButton
          color='primary'
          aria-label='Get Details'
          component='span'
          onClick={() => {
            setSelectedRepo(row);
            getRepoDetails(row);
          }}
        >
          <InfoIcon />
        </IconButton>
      </Tooltip>
    );
    return row;
  });
  const pageOptions = [10, 25, 50];
  const onPageChange = (event, pageNumber) => {
    setTableDataOffsetPage(pageNumber + 1);
    searchAndGet(repoListStore.searchCriteria, repoListStore.tableData.limit, pageNumber + 1);
  };
  const onPageSizeChange = (event) => {
    const pageSize = event.target.value;
    setTableDataLimit(pageSize);
    setTableDataOffsetPage(1);
    searchAndGet(repoListStore.searchCriteria, pageSize, 1);
  };

  /* Repo Details Dialog Props - Dialog Header, Dialog Content */
  const dialogHeader = repoListStore.selectedRepo && repoListStore.selectedRepo['full_name'] ? `Repo Details - ${repoListStore.selectedRepo['full_name']}` : '';
  let lastThreeCommitters = [];
  let recentForkUser = '';
  let recentForkUserBio = '';
  try {
    if (
      repoListStore.repoDetails &&
      repoListStore.selectedRepo &&
      repoListStore.selectedRepo['id'] &&
      repoListStore.repoDetails[repoListStore.selectedRepo['id']]
    ) {
      const repoDetails = repoListStore.repoDetails[repoListStore.selectedRepo['id']] || {};
      if (repoDetails) {
        (repoDetails['commits'] || []).map((commit) => {
          // Observed some records have null value for committer resulting in a failure. Setting default to undefined
          // While displaying, added logic to filter out undefined entries
          lastThreeCommitters.push(commit.committer?.login || undefined);
          return commit;
        });
        recentForkUser =
          repoDetails['recentFork'] && repoDetails['recentFork']['owner'] && repoDetails['recentFork']['owner']['login']
            ? repoDetails['recentFork']['owner']['login']
            : '';
        recentForkUserBio = repoDetails['forkUserBio'] && repoDetails['forkUserBio']['bio'] ? repoDetails['forkUserBio']['bio'] : '';
      }
    }
  } catch (e) {}
  const dialogContent = (
    <Grid>
      <Typography>
        <strong>Last 3 committers: </strong>
      </Typography>
      <Typography>{lastThreeCommitters.filter((_) => _).join(', ')}</Typography>
      <br />
      <Typography>
        <strong>Recent Forked User: </strong>
      </Typography>
      <Typography>{recentForkUser}</Typography>
      <br />
      <Typography>
        <strong>Recent Forked User Bio: </strong>
      </Typography>
      <Typography>{recentForkUserBio}</Typography>
    </Grid>
  );

  return (
    <Grid sx={{ height: 660, width: 1200, p: 2, m: 3 }}>
      <SearchBar onSearch={onSearch} searchInput={repoListStore.searchCriteria} onChangeSearchInput={setSearchCriteria} />
      <Table
        rows={rows}
        columns={columns}
        pageSize={repoListStore.tableData.limit}
        page={repoListStore.tableData.offsetPage - 1}
        enablePagination
        noDataMessage={'No Data Found'}
        rowsPerPageOptions={pageOptions}
        rowCount={repoListStore.tableData.totalCount}
        disableSelectionOnClick
        disableColumnFilter
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
      <Dialog
        open={repoListStore.showDetailsDialog}
        handleClose={() => {
          setShowDetailsDialog(false);
        }}
        headerText={dialogHeader}
        mainContent={dialogContent}
        submitLabel={'Ok'}
      />
    </Grid>
  );
};

export default RepoList;
