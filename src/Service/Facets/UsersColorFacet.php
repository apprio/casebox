<?php

namespace Casebox\CoreBundle\Service\Facets;

class UsersColorFacet extends UsersFacet
{

    public function getClientData($options = array())
    {
        $rez = parent::getClientData();

        $rez['type'] = 'usersColor';

        return $rez;
    }
}
