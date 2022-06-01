import { ReactNode, useEffect, useState } from 'react';
import { Flex, Header, Loader } from '@fluentui/react-northstar';
import * as microsoftTeams from '@microsoft/teams-js';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { getSupportDepartment } from 'api';
import { CustomerInquiryTable } from 'components/CustomerInquiryTable';
import { ConsentRequest } from 'components/ConsentRequest';
import { ApiErrorCode, SupportDepartment } from 'models';
import { isError } from 'utils/ErrorUtils';

function SupportDepartmentChannelTab() {
  const [userHasConsented, setUserHasConsented] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // If someone opens a sub-entity from an Adaptive Card and then navigates backwards using the 'Back' button on the sub-entity page,
    // they will automatically be redirected back to the sub-entity page as the context will still have that value set.
    // We pass a search param to ignore the context in this scenario.
    if (!searchParams.has('ignoreContextRedirect')) {
      // When Teams deep links to the app we need to decided what to show, we read the context to either load a support department, or
      // navigate to a specific inquiry
      microsoftTeams.getContext((context) => {
        let navigationUrl = `/support-department/${context.entityId}`;
        context.subEntityId &&
          (navigationUrl = navigationUrl + '/inquiry/' + context.subEntityId);

        navigate(navigationUrl);
      });
    }
  }, []);

  const params = useParams();
  const entityId: string = params.entityId ?? 'unknown';

  const supportDepartment = useQuery<SupportDepartment, Error>(
    ['getSupportDepartment', { entityId }],
    () => getSupportDepartment(entityId),
    {
      onSuccess: () => {
        setUserHasConsented(false);
      },
    },
  );

  const consentCallback = (error?: string, result?: string) => {
    if (error) {
      console.log(`Error: ${error}`);
    }
    if (result) {
      setUserHasConsented(true);
      supportDepartment.refetch;
    }
  };

  const getErrorNode = (): ReactNode => {
    if (
      isError(ApiErrorCode.AuthConsentRequired, supportDepartment.error) &&
      !userHasConsented
    ) {
      return <ConsentRequest callback={consentCallback} />;
    } else {
      return (
        <Header content={supportDepartment.error?.message ?? 'Unknown error'} />
      );
    }
  };

  return (
    <Flex column>
      {supportDepartment.isLoading && <Loader />}
      {supportDepartment.error && getErrorNode()}
      {supportDepartment.data && (
        <>
          <Header
            content={supportDepartment.data.title}
            description={supportDepartment.data.description}
          />
          <CustomerInquiryTable
            entityId={entityId}
            source="support-department"
            customerInquiries={supportDepartment.data.subEntities}
          />
        </>
      )}
    </Flex>
  );
}

export { SupportDepartmentChannelTab };