class APIFeatures{
    constructor(query , queryString){
        this.query = query;
        this.queryString = queryString;
    }

    // اول حاجة اخاصية الفلتر
    filter(){
        // هناخد نسخة من الكويرى الاصلية عشان منعدلش عليها
        const queryObj = {...this.queryString};

        // عندنا شوية حاجات احنا هنشيلها مش هنعمل عليها فلتر كلمات محجوزة يعنى
        const excludedFields = ['page' , 'sort' , 'limit' , 'fields' , 'search'];
        excludedFields.forEach(el => delete queryObj[el]);

        // هنعمل بقا الفلتر عايزين نحول اللى جاي لحاجة الداتابيز تفهمها
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        // هنا بقا ننفذ الكويرى بتاعتنا ونرجع النتيجة
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    // تانى خاصية وهى السيرش
    search(){
        if(this.queryString.search){
            const search = this.queryString.search;
            this.query = this.query.find({
                $or: [
                    {title: {$regex: search , $options: 'i'}},
                    {description: {$regex: search , $options: 'i'}}
                ]
            });
        }
        return this;
    }

    // تالت حاجة السورتينج (الترتيب)
    sort(){
        if(this.queryString.sort){
            const sortBy = this.queryString.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy);
        }else{
            this.query = this.query.sort('-createdAt')
        }
        return this;
    }

    // رابع حاجة الليميت لو عايز ارجع حاجات معينة
    limitFields(){
        if(this.queryString.fields){
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        }else{
            this.query = this.query.select('-__v')
        }
        return this
    }

    // page = 1  , limit = 12 , skip
    // خامس حاجة وهى ال pagination
    pagination(){
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 12;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        return this;
    }
}

export default APIFeatures;