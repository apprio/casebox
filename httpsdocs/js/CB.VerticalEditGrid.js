Ext.namespace('CB');

CB.VerticalEditGrid = Ext.extend(Ext.grid.EditorGridPanel, {
    border: false
    ,root: 'data'
    ,cls: 'spacy-rows'
    ,autoScroll: true
    ,initComponent: function() {
        var tbar = [
            {
                iconCls: 'icon-table-insert-row'
                ,name: 'duplicateField'
                ,text: L.Add
                ,disabled: true
                ,handler: this.onDuplicateFieldClick
                ,scope: this
            },{
                iconCls: 'icon-table-delete-row'
                ,name: 'deleteDuplicateField'
                ,text: L.Delete
                ,disabled: true
                ,handler: this.onDeleteDuplicateFieldClick
                ,scope: this
            }
        ];

        // add custom toolbar items if defined
        if(this.toolbarItems) {
            Ext.each(
                this.toolbarItems
                ,function(i){
                    if(Ext.isDefined(i.position)) {
                        tbar.splice(i.position, 0, i);
                    } else {
                        tbar.push(i);
                    }
                }
                ,this
            );
        }

        var fields = [
            'id' // it's varchar generated by Ext
            ,'title'
            ,'readonly'
            ,'value'
            ,'info'
        ];

        // define helperTree if owner does not have already defined one
        var parentWindow = this.getBubbleTarget();
        if(parentWindow.helperTree) {
            this.helperTree = parentWindow.helperTree;
        } else {
            this.helperTree = new CB.VerticalEditGridHelperTree();
        }

        gridColumns = [
            {
                header: L.Property
                ,width: 200
                ,dataIndex: 'title'
                ,editable: false
                ,scope: this
                ,renderer : function(v, meta, record, row_idx, col_idx, store){
                    var id = record.get('id');

                    var n = this.helperTree.getNode(id);
                    // temporary workaround for not found nodes
                    if(!n) {
                        return v;
                    }
                    var tr = n.attributes.templateRecord;
                    if(tr.get('type') == 'H'){
                        meta.css ='vgh';
                    }else{
                        meta.css = 'bgcLG vaT';
                        meta.attr = 'style="margin-left: '+(n.getDepth()-1)+'0px"';
                    }
                    if(!Ext.isEmpty(tr.get('cfg').hint)) {
                        meta.attr += ' title="'+tr.get('cfg').hint+'"';
                    }
                    /* setting icon for duplicate fields /**/
                    if(this.helperTree.isDuplicate(id)){
                        //show duplicate index
                        // if last (and not exsceeded) then show + icon
                        if(this.helperTree.canDuplicate(id) && this.helperTree.isLastDuplicate(id)) {
                            v = '<img name="add_duplicate" title="'+L.addDuplicateField+'" class="fr duplicate-plus" src="'+Ext.BLANK_IMAGE_URL + '" / >' + v;
                        } else {
                            idx = this.helperTree.getDuplicateIndex(id) +1;
                            v = '<img title="'+L.duplicate+' '+idx+'" class="fr duplicate'+idx+'" src="'+Ext.BLANK_IMAGE_URL + '" / >' + v;
                        }
                    }
                    return v;
                }
            },{
                header: L.Value
                ,width: 200
                ,dataIndex: 'value'
                ,editor: new Ext.form.TextField()
                ,scope: this
                ,renderer: function(v, meta, record, row_idx, col_idx, store){
                    var n = this.helperTree.getNode(record.get('id'));
                    // temporary workaround for not found nodes
                    if(!n) {
                        return v;
                    }
                    var tr = n.attributes.templateRecord;

                    if(this.renderers && this.renderers[tr.get('type')]) {
                        return this.renderers[tr.get('type')](v, this);
                    }
                    if(!Ext.isEmpty(tr.get('cfg').height)) {
                        meta.attr = ' style="height:' + tr.get('cfg').height + 'px"';
                    }

                    if(Ext.isEmpty(v)) return '';
                    renderer = App.getCustomRenderer(tr.get('type'));
                    if(Ext.isEmpty(renderer)) {
                        return v;
                    }
                    return renderer(v, meta, record, row_idx, col_idx, store, this);
                }
            },{
                header: L.Additionally
                ,width: 200
                ,dataIndex: 'info'
                ,editor: new Ext.form.TextField()
            }
        ];

        Ext.apply(this, {
            store:  new Ext.data.JsonStore({
                fields: fields
                ,reader: new Ext.data.JsonReader({
                    idProperty: 'id'
                    ,messageProperty: 'msg'
                })
                ,proxy: new Ext.data.MemoryProxy([])
                ,listeners: {
                    scope: this
                    ,update: function(store, record, operation) {
                        if(operation != Ext.data.Record.EDIT) {
                            return;
                        }
                        var node = this.helperTree.getNode(record.get('id'));
                        node.attributes.value['value'] = record.get('value');
                        node.attributes.value['info'] = record.get('info');
                    }
                }
            })
            ,columns: gridColumns
            ,sm: new Ext.grid.CellSelectionModel()
            ,stripeRows: true
            ,header: false
            ,clicksToEdit: 1
            ,listeners: {
                scope: this
                ,beforeedit: this.onBeforeEditProperty
                ,afteredit: this.onAfterEditProperty
                ,keypress:  function(e){
                    if( (e.getKey() == e.ENTER) && (!e.hasModifier())) {
                        this.onFieldTitleDblClick();
                    }
                }
                ,celldblclick:  this.onFieldTitleDblClick
                ,cellclick:  this.onCellClick
                ,cellcontextmenu: this.onPopupMenu
            }
            ,statefull: true
            ,stateId: Ext.value(this.stateId, 'veg')//vertical edit grid
            ,viewConfig:{
                autoFill: false
                ,getRowClass: function( record, index, rowParams, store ){
                    var rez = '';
                    if(record.get('type') == 'H'){
                        rez = 'group-titles-colbg';
                        var node = this.grid.helperTree.getNode(record.get('id'));
                        if(node && !Ext.isEmpty(node.attributes.templateRecord.get('cfg').css)){
                            rez += ' ' + node.attributes.templateRecord.get('cfg').css;
                        }
                    }
                    return rez;
                }
            }
            ,editors: {
                iconcombo: function(){
                    return new Ext.form.ComboBox({
                        editable: true
                        ,name: 'iconCls'
                        ,hiddenName: 'iconCls'
                        ,tpl: '<tpl for="."><div class="x-combo-list-item icon-padding16 {name}">{name}</div></tpl>'
                        ,store: CB.DB.templatesIconSet
                        ,valueField: 'name'
                        ,displayField: 'name'
                        ,iconClsField: 'name'
                        ,triggerAction: 'all'
                        ,mode: 'local'
                        ,plugins: [new Ext.ux.plugins.IconCombo()]
                    });
                }
            }
            ,renderers: {
                iconcombo: App.customRenderers.iconcombo
            }
        });
        this.addEvents('change', 'fileupload', 'filedownload', 'filesdelete', 'loaded');
        this.enableBubble(['change', 'fileupload', 'filedownload', 'filesdelete', 'loaded']);
        CB.VerticalEditGrid.superclass.initComponent.apply(this, arguments);
    }
    ,onCellClick: function(g, r, c, e){
        if(g.getColumnModel().getDataIndex(c) == 'files')
            return this.onPopupMenu(g, r, c, e);
        el = e.getTarget();
        if(el) {
            switch(el.name){
                case 'add_duplicate':
                    this.onDuplicateFieldClick();
                    break;
            }
        }
    }
    ,getFilesPopupMenu: function(){
        if(!this.filesPopupMenu) {
            this.filesPopupMenu = new Ext.menu.Menu({
                items: [
                    {
                        text: L.upload
                        ,iconCls: 'icon-upload'
                        ,scope: this
                        ,handler: function(){
                            this.fireEvent('fileupload', this.refOwner.data.id);
                        }
                    },{
                        text: L.download
                        ,iconCls: 'icon-download'
                        ,scope: this
                        ,handler: function(b){
                            if(Ext.isDefined(this.popupForRow)) {
                                this.fireEvent('filedownload', this.store.getAt(this.popupForRow).get('files'));
                            }
                        }
                    },'-'
                    ,{
                        text: L.erase
                        ,iconCls: 'icon-clear'
                        ,scope: this
                        ,handler: function(b){
                            r = this.getStore().getAt(this.popupForRow);
                            if(!r) return;
                            r.set('files', null);
                            this.fireEvent('change');
                            delete this.popupForRow;
                        }
                    }
                    ,{
                        text: L.Delete
                        ,iconCls: 'icon-delete'
                        ,scope: this
                        ,handler: function(b){
                            if(!Ext.isDefined(this.popupForRow)) {
                                return;
                            }
                            r = this.store.getAt(this.popupForRow);
                            f = this.refOwner.getFileProperties(r.get('files'));
                            this.fireEvent('filesdelete', f ? f : r.data);
                        }
                    }
                    ,'-'
                    ,{
                        text: L.uploadAnother
                        ,iconCls: 'icon-upload-other'
                        ,scope: this
                        ,handler: function(){
                            this.fireEvent('fileupload', this.refOwner.data.id);
                        }
                    },'-'
                    ,{
                        text: L.files
                        ,iconCls: 'icon-files'
                        ,hideOnClick: false
                        ,menu: []
                    }
                ]
                ,listeners: {
                    scope: this
                    ,itemclick: function(){
                        this.keepPopupRef = true;
                    }
                    ,hide: function(){
                        if(!this.keepPopupRef) {
                            delete this.popupForRow;
                            delete this.keepPopupRef;
                        }
                    }
                }
            });
        }
        this.filesPopupMenu.items.each(
            function(i){
                i.setVisible(true);
            }
        );
        return this.filesPopupMenu;
    }
    ,onFileUploaded: function(data){
        if(!Ext.isDefined(this.popupForRow)) {
            return;
        }
        this.store.getAt(this.popupForRow).set('files', data.id);
        delete this.popupForRow;
        this.fireEvent('change');
    }
    ,onPopupMenu: function(g, r, c, e){
        e.preventDefault();
        switch(g.getColumnModel().getDataIndex(c)){
            case 'files':
                this.showFilesPopupMenu(g, r, c, e);
                break;
            case 'title':
                this.showTitlePopupMenu(g, r, c, e);
                break;
        }
    }
    ,showFilesPopupMenu: function(grid, rowIndex, cellIndex, e){
        if(rowIndex <0) {
            return;
        }
        pm = this.getFilesPopupMenu();
        this.popupForRow = rowIndex;
        r = grid.getStore().getAt(rowIndex);
        if(!r) return;
        if(r.get('files')){
            pm.items.itemAt(pm.items.findIndex('iconCls', 'icon-upload')).hide();
            //download already visible
            //delete already visible
        }else{
            //upload already visible
            pm.items.itemAt(pm.items.findIndex('iconCls', 'icon-download')).hide();

            idx = pm.items.findIndex('iconCls', 'icon-clear');
            ci = pm.items.itemAt(idx).hide();
            pm.items.itemAt(idx - 1).hide();

            pm.items.itemAt(pm.items.findIndex('iconCls', 'icon-delete')).hide();

            idx = pm.items.findIndex('iconCls', 'icon-upload-other');
            pm.items.itemAt(idx-1).hide();
            pm.items.itemAt(idx).hide();
        }
        fm = pm.items.itemAt(pm.items.findIndex('iconCls', 'icon-files'));
        fm.menu.removeAll(true);
        if(this.refOwner.filesGrid)
            this.refOwner.filesGrid.getStore().each(function(i){
                fm.menu.add( new Ext.menu.Item({
                        text: i.get('name')
                        ,iconCls: 'file file-unknown '+i.get('iconCls')
                        ,data:{id: i.get('id')}
                        ,scope: this
                        ,handler: this.setPropertyFile
                    })
                );
            }, this);
        if(fm.menu.items.getCount() < 1) fm.setVisible(false);
        pm.showAt(e.getXY());
    }
    ,showTitlePopupMenu: function(grid, rowIndex, cellIndex, e){
        r = grid.getStore().getAt(rowIndex);
        this.popupForRow = rowIndex;
        if(!this.titlePopupMenu) this.titlePopupMenu = new Ext.menu.Menu({
            items: [
                {
                    text: L.addDuplicateField
                    ,scope: this
                    ,handler: this.onDuplicateFieldClick
                },{
                    text: L.delDuplicateField
                    ,scope: this
                    ,handler: this.onDeleteDuplicateFieldClick
                }
            ]
        });
        this.titlePopupMenu.items.itemAt(0).setDisabled(!this.helperTree.canDuplicate(r.get('id')));
        this.titlePopupMenu.items.itemAt(1).setDisabled(this.helperTree.isFirstDuplicate(r.get('id')));
        this.titlePopupMenu.showAt(e.getXY());
    }
    ,setPropertyFile: function(b){
        if(!Ext.isDefined(this.popupForRow)) return;
        this.store.getAt(this.popupForRow).set('files', b.data.id);
        delete this.popupForRow;
        this.fireEvent('change');  //this.refOwner.setDirty(true);
    }
    ,onFieldTitleDblClick: function(){
        var sm = this.getSelectionModel();
        var cm = this.getColumnModel();
        var s = sm.getSelectedCell();
        var gv = this.getView();

        if(Ext.isEmpty(s)) return;
        var fieldName = cm.getDataIndex(s[1]);

        if(fieldName == 'title'){
            c = gv.getCell(s[0], s[1]);
            c.className = c.className.replace( (c.className.indexOf(' x-grid3-cell-selected') >= 0 ? ' x-grid3-cell-selected' : 'x-grid3-cell-selected'), '');
            s[1] = cm.findColumnIndex('value');
            this.getView().focusCell(s[0], s[1], false, false);
            this.startEditing(s[0], s[1]);//begin field edit
        }
    }
    ,getBubbleTarget: function(){
        if(!this.parentWindow){
            this.parentWindow = this.findParentByType('CBGenericForm') || this.refOwner;
        }
        return this.parentWindow;
    }
    ,reload: function(){
        // initialization
        this.data = {};
        var pw = this.getBubbleTarget(); //parent window
        if(Ext.isDefined(pw.data) && Ext.isDefined(pw.data[this.root])) {
            this.data = pw.data[this.root];
        }
        //if not specified template_id directly to grid then try to look in owners data
        this.template_id = Ext.value(this.template_id, pw.data.template_id);
        if(isNaN(this.template_id)) {
            return Ext.Msg.alert('Error', 'No template id specified in data for "' + pw.title + '" window.');
        }
        this.templateStore = CB.DB['template' + this.template_id];

        // if parent have a helperTree then it is responsible for helper reload
        if(!pw.helperTree) {
            this.helperTree.loadData(this.data, this.templateStore);
        }

        this.syncRecordsWithHelper();

        this.fireEvent('loaded', this);
    }
    ,syncRecordsWithHelper: function(){
        if(!this.store) {
            return;
        }

        // remember last selected cell
        var lastCell = this.getSelectionModel().getSelectedCell();

        var nodesList = this.helperTree.queryNodeListBy(this.helperNodesFilter);

        if(this.store && this.store.suspendEvents) {
            this.store.suspendEvents(true);
        }

        this.store.removeAll(false);

        var records = [];
        for (var i = 0; i < nodesList.length; i++) {
            var attr = nodesList[i].attributes;
            var r  = attr.templateRecord;
            records.push(
                new this.store.recordType({
                    id: attr.id
                    ,title: r.get('title')
                    ,readonly: ((r.get('type') == 'H') || (r.get('cfg').readOnly == 1))
                    ,value: attr.value.value
                    ,info: attr.value.info
                })
            );
        }
        this.store.resumeEvents();
        this.store.add(records);

        if(lastCell){
            this.getSelectionModel().select(lastCell[0], lastCell[1]);
        }
    }
    ,helperNodesFilter: function(node){
        var r = node.attributes.templateRecord;
        //skip check for root node
        if(Ext.isEmpty(r)) {
            return false;
        }

        return (
            (r.get('cfg').showIn != 'top') &&
            (r.get('cfg').showIn != 'tabsheet') &&
            (node.attributes.visible !== false)
        );
    }
    ,readValues: function(){
        if(!Ext.isDefined(this.data)) {
            this.data = {};
        }

        this.data = this.helperTree.readValues();

        w = this.getBubbleTarget();
        if(Ext.isDefined(w.data)) {
            w.data[this.root] = this.data;
        }
    }
    ,onBeforeEditProperty: function(e){//grid, record, field, value, row, column, cancel

        var node = this.helperTree.getNode(e.record.get('id'));
        // temporary workaround for not found nodes
        if(!node) {
            e.cancel = true;
            return;
        }
        var tr = node.attributes.templateRecord;
        if((tr.get('type') == 'H') || (tr.get('cfg').readOnly == 1) ){
            e.cancel = true;
            return;
        }
        if(e.field != 'value') return;

        pw = this.findParentByType(CB.GenericForm, false); //CB.Objects & CB.TemplateEditWindow
        t = tr.get('type');
        if(pw && !Ext.isEmpty(pw.data)){
            e.objectId = pw.data.id;
            e.path = pw.data.path;
        }

        /* setting by default parent case id for case_objects fields,
        this value will be overwriten if it is dependent on another field */
        if(pw && (t == '_case_object') ) {
            e.pidValue = pw.data.id;
        }

        /* get and set pidValue if dependent */
        if( (Ext.isDefined(tr.get('cfg').dependency) ) && !Ext.isEmpty(tr.get('pid')) ) {
                e.pidValue = this.helperTree.getParentValue(e.record.get('id'), tr.get('pid'));
        }

        var col = e.grid.colModel.getColumnAt(e.column);
        var ed = col.getEditor();
        if(ed) {
            ed.destroy();
        }
        if(this.editors && this.editors[t]) {
            col.setEditor(new Ext.grid.GridEditor(this.editors[t](this)));
        }else{
            e.fieldRecord = this.helperTree.getNode(e.record.get('id')).attributes.templateRecord;
            var te = App.getTypeEditor(t, e);
            if(e.cancel) {
                return ;
            }
            col.setEditor(new Ext.grid.GridEditor(te));
        }
    }
    ,gainFocus: function(){
        this.focus(false);
        var sm = this.getSelectionModel();
        if(sm && sm.getSelectedCell) {
            var s = sm.getSelectedCell();
            if(s) {
                this.getView().focusCell(s[0], s[1]);
            }
        }
    }
    ,onAfterEditProperty: function(e){
        if(e.field != 'value'){
            if(e.value != e.originalValue) {
                this.fireEvent('change');
            }
            return;
        }
        if(e.value != e.originalValue){
            this.helperTree.resetChildValues(e.record.get('id'));
            this.fireEvent('change');
        }
        this.syncRecordsWithHelper();
        this.gainFocus();
    }
    ,getFieldValue: function(field_id, duplication_id){
        //TODO: review
        result = null;

        this.store.each(
            function(r){
                if((r.get('field_id') == field_id) && (r.get('duplicate_id') == duplication_id)){
                    result = r.get('value');
                    return false;
                }
            }
            ,this
        );
        return result;
    }

    ,onDuplicateFieldClick: function(b){
        var s = this.getSelectionModel().getSelectedCell();
        if(Ext.isEmpty(s)) {
            return;
        }
        r = this.store.getAt(s[0]);
        this.helperTree.duplicate(r.get('id'));
        this.syncRecordsWithHelper();
        this.fireEvent('change');
    }
    ,onDeleteDuplicateFieldClick: function(b){
        var s = this.getSelectionModel().getSelectedCell();
        if(Ext.isEmpty(s)) {
            return;
        }
        r = this.store.getAt(s[0]);
        this.helperTree.deleteDuplicate(r.get('id'));
        this.syncRecordsWithHelper();
        this.fireEvent('change');
    }
});

Ext.reg('CBVerticalEditGrid', CB.VerticalEditGrid);
